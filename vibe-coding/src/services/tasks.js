const Task = require('../models/Task');
const { TRANSITIONS, TERMINAL } = require('../models/Task');
// Date-only deadlines expire at the start of the following UTC calendar day.
function todayUTC() { const now = new Date(); return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); }
async function expireTasks() {
  return Task.updateMany({ status: { $in: ['todo', 'ongoing'] }, deadline: { $lt: todayUTC() } }, { $set: { status: 'failed' }, $inc: { __v: 1 } });
}
async function transitionTask(id, next, extraFilter = {}) {
  if (!['ongoing', 'done', 'cancelled', 'failed'].includes(next)) return null;
  const sources = Object.keys(TRANSITIONS).filter(s => TRANSITIONS[s].includes(next));
  return Task.findOneAndUpdate({ _id: id, ...extraFilter, status: { $in: sources }, deadline: { $gte: todayUTC() } }, { $set: { status: next }, $inc: { __v: 1 } }, { new: true, runValidators: true });
}
module.exports = { todayUTC, expireTasks, transitionTask, TERMINAL };
