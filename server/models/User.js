const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['applicant', 'verifier', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'applicant' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function matchPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
