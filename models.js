const mongoose = require('mongoose');
const { Schema } = mongoose;

const EMAIL = [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'];
const PHONE = [/^\d{10}$/, 'Enter a valid phone number (10 digits).'];
const ROLES = ['Admin', 'Manager', 'Sales Executive'];

// Today's date as YYYY-MM-DD, used for "date cannot be in the past" rules.
const today = () => new Date().toLocaleDateString('en-CA');
const dateOnly = (d) => new Date(d).toISOString().slice(0, 10);

const customerRef = {
  type: Schema.Types.ObjectId,
  ref: 'Customer',
  required: [true, 'Customer is required.'],
  validate: {
    validator: async (id) => !!(await mongoose.model('Customer').exists({ _id: id })),
    message: 'Selected customer does not exist.'
  }
};

// Gives new records a readable code such as CUS-0001 or LD-0001.
function addCode(schema, prefix) {
  schema.add({ code: { type: String, unique: true, sparse: true } });
  schema.pre('save', async function () {
    if (this.code) return;
    const last = await this.constructor.findOne({ code: { $exists: true } }).sort({ createdAt: -1 });
    const next = last ? parseInt(last.code.split('-')[1], 10) + 1 : 1;
    this.code = prefix + '-' + String(next).padStart(4, '0');
  });
}

// ---------- User ----------
const userSchema = new Schema({
  name: { type: String, required: [true, 'Name is required.'], trim: true, maxlength: [100, 'Name is too long.'] },
  email: { type: String, required: [true, 'Email is required.'], trim: true, lowercase: true, unique: true, match: EMAIL },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: { values: ROLES, message: 'Invalid role.' }, default: 'Sales Executive' },
  isActive: { type: Boolean, default: true },
  failedLogins: { type: Number, default: 0 },
  lockUntil: Date
}, {
  timestamps: true,
  // Never send password hashes or lockout counters to the browser.
  toJSON: {
    transform: (doc, ret) => {
      ret.locked = !!(ret.lockUntil && ret.lockUntil > Date.now());
      delete ret.passwordHash;
      delete ret.failedLogins;
      delete ret.lockUntil;
      return ret;
    }
  }
});
const User = mongoose.model('User', userSchema);

// ---------- Customer ----------
const customerSchema = new Schema({
  name: { type: String, required: [true, 'Customer name is required.'], trim: true, maxlength: [100, 'Name is too long.'] },
  email: { type: String, required: [true, 'Email is required.'], trim: true, lowercase: true, unique: true, match: EMAIL },
  phone: { type: String, required: [true, 'Phone is required.'], trim: true, unique: true, match: PHONE },
  company: { type: String, trim: true, maxlength: [100, 'Company is too long.'] },
  address: { type: String, trim: true, maxlength: [200, 'Address is too long.'] },
  city: { type: String, trim: true, maxlength: [50, 'City is too long.'] },
  state: { type: String, trim: true, maxlength: [50, 'State is too long.'] },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });
addCode(customerSchema, 'CUS');
const Customer = mongoose.model('Customer', customerSchema);

// ---------- Lead ----------
const leadSchema = new Schema({
  name: { type: String, required: [true, 'Lead name is required.'], trim: true, maxlength: [100, 'Name is too long.'] },
  email: { type: String, trim: true, lowercase: true, match: EMAIL },
  phone: { type: String, trim: true, match: PHONE },
  company: { type: String, trim: true, maxlength: [100, 'Company is too long.'] },
  source: { type: String, enum: ['Website', 'Referral', 'Social Media', 'Email', 'Other'], default: 'Website' },
  status: {
    type: String,
    required: [true, 'Lead status is required.'],
    enum: { values: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'], message: 'Invalid lead status.' },
    default: 'New'
  },
  expectedValue: { type: Number, min: [0, 'Expected value cannot be negative.'], max: [10000000, 'Expected value is too large.'] }
}, { timestamps: true });
addCode(leadSchema, 'LD');
const Lead = mongoose.model('Lead', leadSchema);

// ---------- Opportunity ----------
const Opportunity = mongoose.model('Opportunity', new Schema({
  name: { type: String, required: [true, 'Opportunity name is required.'], trim: true, maxlength: [100, 'Name is too long.'] },
  customer: customerRef,
  amount: {
    type: Number,
    required: [true, 'Amount is required.'],
    validate: { validator: (v) => v > 0, message: 'Opportunity Amount must be greater than 0.' }
  },
  probability: {
    type: Number,
    required: [true, 'Probability is required.'],
    min: [0, 'Probability must be between 0 and 100.'],
    max: [100, 'Probability must be between 0 and 100.']
  },
  stage: { type: String, enum: ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'], default: 'Qualification' },
  expectedCloseDate: {
    type: Date,
    required: [true, 'Expected close date is required.'],
    validate: {
      // Only open (active) opportunities need a future close date.
      validator: function (v) {
        return ['Won', 'Lost'].includes(this.stage) || dateOnly(v) >= today();
      },
      message: 'Expected Close Date cannot be in the past.'
    }
  }
}, { timestamps: true }));

// ---------- Follow-Up ----------
const FollowUp = mongoose.model('FollowUp', new Schema({
  subject: { type: String, required: [true, 'Subject is required.'], trim: true, maxlength: [100, 'Subject is too long.'] },
  customer: customerRef,
  type: { type: String, enum: ['Call', 'Meeting', 'Email'], default: 'Call' },
  date: {
    type: Date,
    required: [true, 'Follow-up date is required.'],
    validate: {
      // A planned follow-up cannot be scheduled in the past.
      validator: function (v) {
        return this.status !== 'Planned' || dateOnly(v) >= today();
      },
      message: 'Follow-up date cannot be earlier than today.'
    }
  },
  status: { type: String, enum: ['Planned', 'Completed', 'Missed', 'Cancelled'], default: 'Planned' },
  remarks: { type: String, trim: true, maxlength: [500, 'Remarks are too long.'] }
}, { timestamps: true }));

// ---------- Activity ----------
const Activity = mongoose.model('Activity', new Schema({
  type: { type: String, enum: ['Call', 'Meeting', 'Email', 'Task'], default: 'Call' },
  subject: { type: String, required: [true, 'Subject is required.'], trim: true, maxlength: [100, 'Subject is too long.'] },
  customer: customerRef,
  date: { type: Date, required: [true, 'Activity date is required.'] },
  status: { type: String, enum: ['Open', 'Completed'], default: 'Open' },
  description: { type: String, trim: true, maxlength: [500, 'Description is too long.'] }
}, { timestamps: true }));

// ---------- Audit Log ----------
const AuditLog = mongoose.model('AuditLog', new Schema({
  userName: String,
  userEmail: String,
  action: String,      // Login, Login Failed, Create, Update, Delete, ...
  entity: String,      // Customer, Lead, User, ...
  recordId: String,
  details: String,     // old value -> new value, or a short description
  ip: String
}, { timestamps: { createdAt: true, updatedAt: false } }));

module.exports = { User, Customer, Lead, Opportunity, FollowUp, Activity, AuditLog, ROLES };
