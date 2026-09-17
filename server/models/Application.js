const mongoose = require('mongoose');

// The full lifecycle of an application, in order.
const STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'POLICE_VERIFICATION',
  'VERIFICATION_PASSED',
  'VERIFICATION_FAILED',
  'APPROVED',
  'REJECTED',
];

const DOC_TYPES = ['photo', 'proof_of_address', 'proof_of_dob', 'id_proof', 'other'];

const documentSchema = new mongoose.Schema(
  {
    docType: { type: String, enum: DOC_TYPES, required: true },
    originalName: String,
    storedName: String,
    mimeType: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const timelineSchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    note: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    applicationNumber: { type: String, unique: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicationType: { type: String, enum: ['fresh', 'reissue'], default: 'fresh' },

    personal: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      dob: { type: Date, required: true },
      gender: { type: String, enum: ['male', 'female', 'other'], required: true },
      placeOfBirth: { type: String, required: true, trim: true },
      maritalStatus: { type: String, enum: ['single', 'married', 'other'], default: 'single' },
    },

    family: {
      fatherName: { type: String, trim: true },
      motherName: { type: String, trim: true },
    },

    contact: {
      phone: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      address: {
        line1: { type: String, required: true, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true, match: [/^\d{6}$/, 'Pincode must be 6 digits'] },
      },
    },

    documents: [documentSchema],

    status: { type: String, enum: STATUSES, default: 'DRAFT', index: true },

    policeVerification: {
      verdict: { type: String, enum: ['pending', 'clear', 'adverse'], default: 'pending' },
      remarks: String,
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: Date,
    },

    passportNumber: { type: String },
    issuedAt: Date,
    rejectionReason: String,

    timeline: [timelineSchema],
  },
  { timestamps: true }
);

// APP-2026-000137 style reference, generated once on first save.
applicationSchema.pre('validate', async function setApplicationNumber(next) {
  if (this.applicationNumber) return next();
  const year = new Date().getFullYear();
  const count = await mongoose.model('Application').countDocuments();
  this.applicationNumber = `APP-${year}-${String(count + 1).padStart(6, '0')}`;
  next();
});

applicationSchema.methods.pushTimeline = function pushTimeline(status, note, user) {
  this.timeline.push({
    status,
    note,
    by: user?._id,
    byName: user?.name,
    at: new Date(),
  });
};

applicationSchema.virtual('fullName').get(function fullName() {
  return `${this.personal.firstName} ${this.personal.lastName}`;
});

applicationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Application', applicationSchema);
module.exports.STATUSES = STATUSES;
module.exports.DOC_TYPES = DOC_TYPES;
