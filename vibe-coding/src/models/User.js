const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'receiver'], default: 'receiver', required: true }
}, { timestamps: true });
userSchema.methods.verifyPassword = function (password) { return bcrypt.compare(password, this.passwordHash); };
userSchema.statics.hashPassword = function (password) { return bcrypt.hash(password, 12); };
module.exports = mongoose.model('User', userSchema);
