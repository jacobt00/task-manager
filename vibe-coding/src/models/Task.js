const mongoose = require('mongoose');
const STATUSES = ['todo', 'ongoing', 'done', 'cancelled', 'failed'];
const TERMINAL = ['done', 'cancelled', 'failed'];
const TRANSITIONS = Object.freeze({ todo: ['ongoing', 'cancelled', 'failed'], ongoing: ['done', 'cancelled', 'failed'], done: [], cancelled: [], failed: [] });
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  deadline: { type: Date, required: true },
  assignedReceiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: STATUSES, default: 'todo', required: true }
}, { timestamps: true });
taskSchema.index({ createdAt: -1 });
module.exports = mongoose.model('Task', taskSchema);
module.exports.STATUSES = STATUSES;
module.exports.TERMINAL = TERMINAL;
module.exports.TRANSITIONS = TRANSITIONS;
