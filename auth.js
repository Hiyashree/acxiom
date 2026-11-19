const express = require('express');
const bcrypt = require('bcryptjs');
const { User, AuditLog, ROLES } = require('./models');

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// Password policy: at least 8 characters with at least one letter and one number.
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_MESSAGE = 'Password must be at least 8 characters and contain a letter and a number.';

// ---------- Audit helper ----------
async function audit(req, action, entity, recordId, details, user) {
  const who = user || req.user || {};
  try {
    await AuditLog.create({
      userName: who.name || 'Unknown',
      userEmail: who.email || '',
      action, entity,
      recordId: recordId ? String(recordId) : '',
      details: details || '',
      ip: req.ip
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// ---------- Middleware ----------
// Loads the logged-in user (if any) on every request.
async function loadUser(req, res, next) {
  if (req.session.userId) {
    const user = await User.findById(req.session.userId).catch(() => null);
    if (user && user.isActive) req.user = user;
    else req.session.userId = null;
  }
  next();
}

function requireLogin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in.' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please log in.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do this.' });
    next();
  };
}

// ---------- Auth routes: /api/auth ----------
const authRouter = express.Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!PASSWORD_RULE.test(password || '')) return res.status(400).json({ error: PASSWORD_MESSAGE });
    if (await User.exists({ email: String(email || '').toLowerCase().trim() })) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    // The very first user becomes Admin. Everyone else starts as Sales Executive.
    const role = (await User.countDocuments()) === 0 ? 'Admin' : 'Sales Executive';
    const user = await User.create({ name, email, role, passwordHash: await bcrypt.hash(password, 10) });
    await audit(req, 'Register', 'User', user._id, 'New account (' + role + ')', user);
    req.session.regenerate(() => {
      req.session.userId = user._id;
      res.status(201).json(user);
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors).map(e => e.message).join(' ') });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

authRouter.post('/login', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const user = await User.findOne({ email });

  if (!user) {
    await audit(req, 'Login Failed', 'User', '', 'Unknown email: ' + email, { name: 'Unknown', email });
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return res.status(423).json({ error: `Account is locked. Try again in ${minutes} minute(s).` });
  }
  if (!user.isActive) {
    return res.status(403).json({ error: 'This account has been deactivated. Contact the administrator.' });
  }

  const ok = await bcrypt.compare(req.body.password || '', user.passwordHash);
  if (!ok) {
    user.failedLogins += 1;
    if (user.failedLogins >= MAX_FAILED_LOGINS) {
      user.failedLogins = 0;
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
      await user.save();
      await audit(req, 'Account Locked', 'User', user._id, `${MAX_FAILED_LOGINS} failed login attempts`, user);
      return res.status(423).json({ error: `Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes.` });
    }
    await user.save();
    await audit(req, 'Login Failed', 'User', user._id, 'Wrong password', user);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  user.failedLogins = 0;
  user.lockUntil = undefined;
  await user.save();
  await audit(req, 'Login', 'User', user._id, 'Logged in', user);
  req.session.regenerate(() => {
    req.session.userId = user._id;
    res.json(user);
  });
});

authRouter.post('/logout', async (req, res) => {
  if (req.user) await audit(req, 'Logout', 'User', req.user._id, 'Logged out');
  req.session.destroy(() => res.json({ message: 'Logged out.' }));
});

authRouter.get('/me', requireLogin, (req, res) => res.json(req.user));

// ---------- User management: /api/users (Admin only) ----------
const usersRouter = express.Router();
usersRouter.use(requireRole('Admin'));

usersRouter.get('/', async (req, res) => {
  res.json(await User.find().sort({ createdAt: -1 }));
});

usersRouter.post('/', async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    if (!PASSWORD_RULE.test(password || '')) return res.status(400).json({ error: PASSWORD_MESSAGE });
    const user = await User.create({
      name, email, role,
      isActive: req.body.isActive !== 'false',
      passwordHash: await bcrypt.hash(password, 10)
    });
    await audit(req, 'Create', 'User', user._id, `${user.email} (${user.role})`);
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors).map(e => e.message).join(' ') });
    }
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Update name, role, active status or reset the password. Saving also unlocks the account.
usersRouter.put('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { name, email, role, isActive, password } = req.body;
    const active = isActive !== 'false' && isActive !== false;

    if (String(user._id) === String(req.user._id) && (role !== 'Admin' || !active)) {
      return res.status(400).json({ error: 'You cannot remove your own Admin role or deactivate yourself.' });
    }
    if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });

    const changes = [];
    if (role && role !== user.role) changes.push(`role: ${user.role} → ${role}`);
    if (active !== user.isActive) changes.push(`active: ${user.isActive} → ${active}`);

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    user.isActive = active;
    user.failedLogins = 0;
    user.lockUntil = undefined;
    if (password) {
      if (!PASSWORD_RULE.test(password)) return res.status(400).json({ error: PASSWORD_MESSAGE });
      user.passwordHash = await bcrypt.hash(password, 10);
      changes.push('password reset');
    }
    await user.save();
    await audit(req, changes.some(c => c.startsWith('role')) ? 'Role Change' : 'Update', 'User', user._id,
      changes.join(', ') || 'details updated');
    res.json(user);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors).map(e => e.message).join(' ') });
    }
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

usersRouter.delete('/:id', async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  const user = await User.findByIdAndDelete(req.params.id).catch(() => null);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  await audit(req, 'Delete', 'User', user._id, user.email);
  res.json({ message: 'Deleted.' });
});

module.exports = { audit, loadUser, requireLogin, requireRole, authRouter, usersRouter };
