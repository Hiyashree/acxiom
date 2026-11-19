const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const { Customer, Lead, Opportunity, FollowUp, Activity, AuditLog } = require('./models');
const { audit, loadUser, requireLogin, requireRole, authRouter, usersRouter } = require('./auth');

const PORT = process.env.PORT || 3000;
const LOCAL_URI = 'mongodb://127.0.0.1:27017/acxiomcrm';

const app = express();
app.use(express.json());
app.use(session({
  // Use SESSION_SECRET in production. A random one means everyone logs out on restart.
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(loadUser);

// ---------- API ----------
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api', requireLogin); // everything below needs a logged-in user

// Turns database errors into friendly messages with the right status code.
function sendError(res, err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(err.errors).map(e => e.message).join(' ') });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    return res.status(409).json({ error: `A record with this ${field} already exists.` });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for ${err.path}.` });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

// Shows a value nicely in the audit log.
function show(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value === undefined || value === null || value === '') return '(empty)';
  return String(value);
}

// Creates the 5 standard REST routes (list, get, create, update, delete) for a model.
// Every change is written to the audit log. Only Admin and Manager can delete.
function crudRoutes(name, entity, Model, populate) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      let query = Model.find().sort({ createdAt: -1 });
      if (populate) query = query.populate(populate, 'name');
      res.json(await query);
    } catch (err) { sendError(res, err); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Record not found.' });
      res.json(doc);
    } catch (err) { sendError(res, err); }
  });

  router.post('/', async (req, res) => {
    try {
      delete req.body._id;
      delete req.body.code;
      const doc = await new Model(req.body).save();
      await audit(req, 'Create', entity, doc._id, doc.name || doc.subject);
      res.status(201).json(doc);
    } catch (err) { sendError(res, err); }
  });

  router.put('/:id', async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Record not found.' });
      delete req.body._id;
      delete req.body.code;
      const before = doc.toObject();
      doc.set(req.body);
      const changes = doc.modifiedPaths().map(p => `${p}: ${show(before[p])} → ${show(doc.get(p))}`);
      await doc.save();
      if (changes.length) await audit(req, 'Update', entity, doc._id, changes.join('; '));
      res.json(doc);
    } catch (err) { sendError(res, err); }
  });

  router.delete('/:id', requireRole('Admin', 'Manager'), async (req, res) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Record not found.' });
      await audit(req, 'Delete', entity, doc._id, doc.name || doc.subject);
      res.json({ message: 'Deleted.' });
    } catch (err) { sendError(res, err); }
  });

  app.use('/api/' + name, router);
}

crudRoutes('customers', 'Customer', Customer);
crudRoutes('leads', 'Lead', Lead);
crudRoutes('opportunities', 'Opportunity', Opportunity, 'customer');
crudRoutes('followups', 'Follow-Up', FollowUp, 'customer');
crudRoutes('activities', 'Activity', Activity, 'customer');

// Lead conversion: a Qualified lead becomes a new customer.
app.post('/api/leads/:id/convert', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    if (lead.status !== 'Qualified') {
      return res.status(400).json({ error: 'Only Qualified leads can be converted.' });
    }
    if (!lead.email || !lead.phone) {
      return res.status(400).json({ error: 'Add an email and phone to the lead before converting.' });
    }
    const customer = await new Customer({
      name: lead.name, email: lead.email, phone: lead.phone, company: lead.company
    }).save();
    lead.status = 'Converted';
    await lead.save();
    await audit(req, 'Convert', 'Lead', lead._id, `${lead.code || lead.name} → customer ${customer.code}`);
    res.status(201).json(customer);
  } catch (err) { sendError(res, err); }
});

// Small helper: count records grouped by one field.
function countBy(Model, field, extra = {}) {
  return Model.aggregate([
    { $group: { _id: '$' + field, count: { $sum: 1 }, ...extra } },
    { $sort: { _id: 1 } }
  ]);
}

// Start of today, matching how dates from <input type="date"> are stored.
const startOfToday = () => new Date(new Date().toLocaleDateString('en-CA') + 'T00:00:00Z');

// Dashboard numbers and chart data.
app.get('/api/stats', async (req, res) => {
  try {
    const open = { stage: { $nin: ['Won', 'Lost'] } };
    const [customers, leads, openLeads, openOpportunities, won, lost, pipeline, pendingFollowUps,
      leadStatus, pipelineByStage, monthlySales] = await Promise.all([
      Customer.countDocuments(),
      Lead.countDocuments(),
      Lead.countDocuments({ status: { $nin: ['Converted', 'Lost', 'Unqualified'] } }),
      Opportunity.countDocuments(open),
      Opportunity.countDocuments({ stage: 'Won' }),
      Opportunity.countDocuments({ stage: 'Lost' }),
      Opportunity.aggregate([{ $match: open }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      FollowUp.countDocuments({ status: 'Planned' }),
      countBy(Lead, 'status'),
      countBy(Opportunity, 'stage', { amount: { $sum: '$amount' } }),
      Opportunity.aggregate([
        { $match: { stage: 'Won' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$expectedCloseDate' } }, amount: { $sum: '$amount' } } }
      ])
    ]);
    res.json({
      customers, leads, openLeads, openOpportunities, won, lost,
      pipelineValue: pipeline[0] ? pipeline[0].total : 0,
      pendingFollowUps, leadStatus, pipelineByStage, monthlySales
    });
  } catch (err) { sendError(res, err); }
});

// Reports page data (Admin and Manager).
app.get('/api/reports', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const [leadsByStatus, leadsBySource, opportunitiesByStage, followUpsByStatus, overdueFollowUps,
      activitiesByType, userActivity, totalLeads, convertedLeads] = await Promise.all([
      countBy(Lead, 'status', { value: { $sum: '$expectedValue' } }),
      countBy(Lead, 'source'),
      countBy(Opportunity, 'stage', {
        amount: { $sum: '$amount' },
        weighted: { $sum: { $divide: [{ $multiply: ['$amount', '$probability'] }, 100] } }
      }),
      countBy(FollowUp, 'status'),
      FollowUp.countDocuments({ status: 'Planned', date: { $lt: startOfToday() } }),
      countBy(Activity, 'type'),
      AuditLog.aggregate([
        { $group: { _id: '$userName', count: { $sum: 1 }, lastAction: { $max: '$createdAt' } } },
        { $sort: { count: -1 } }
      ]),
      Lead.countDocuments(),
      Lead.countDocuments({ status: 'Converted' })
    ]);
    res.json({
      leadsByStatus, leadsBySource, opportunitiesByStage, followUpsByStatus, overdueFollowUps,
      activitiesByType, userActivity, totalLeads, convertedLeads
    });
  } catch (err) { sendError(res, err); }
});

// Audit log (Admin only, read-only).
app.get('/api/audit', requireRole('Admin'), async (req, res) => {
  try {
    res.json(await AuditLog.find().sort({ createdAt: -1 }).limit(1000));
  } catch (err) { sendError(res, err); }
});

// Unknown API routes return JSON instead of the React page.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// ---------- React app ----------
// The built React app (client/dist) is served for every other URL.
// Logins and roles are checked by the API above, so the pages themselves are public files.
const CLIENT_DIR = path.join(__dirname, 'client', 'dist');
app.use(express.static(CLIENT_DIR));
app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'index.html'), (err) => {
    if (err) res.status(500).send('The React app is not built yet. Run "npm run build" first.');
  });
});

// ---------- Database ----------
// 1. Use MONGODB_URI if it is set (for example a MongoDB Atlas cluster).
// 2. Otherwise use a local MongoDB server if one is running.
// 3. Otherwise start a built-in MongoDB that saves its data in the ./data folder.
let builtInMongo = null;

async function connectToDatabase() {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    return 'MONGODB_URI';
  }

  try {
    await mongoose.connect(LOCAL_URI, { serverSelectionTimeoutMS: 2000 });
    return 'local MongoDB (' + LOCAL_URI + ')';
  } catch {
    console.log('No local MongoDB found, starting the built-in MongoDB...');
  }

  const fs = require('fs');
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const dbPath = path.join(__dirname, 'data');
  fs.mkdirSync(dbPath, { recursive: true });

  builtInMongo = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: 'wiredTiger' }
  });
  await mongoose.connect(builtInMongo.getUri('acxiomcrm'));
  return 'built-in MongoDB (data saved in ./data)';
}

async function shutdown() {
  await mongoose.disconnect();
  if (builtInMongo) await builtInMongo.stop({ doCleanup: false });
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

connectToDatabase()
  .then((source) => {
    console.log('Connected to ' + source);
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
