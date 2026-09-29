const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const { requireAdmin } = require('../middleware/auth');
const { expireTasks, transitionTask, TERMINAL, todayUTC } = require('../services/tasks');
const router = express.Router();
router.use(requireAdmin);
const labels = { todo: 'To do', ongoing: 'Ongoing', done: 'Done', cancelled: 'Cancelled', failed: 'Failed' };
const allowed = { todo: ['ongoing', 'cancelled', 'failed'], ongoing: ['done', 'cancelled', 'failed'], done: [], cancelled: [], failed: [] };
function dateInput(date) { if (!date) return ''; const d = new Date(date); return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10); }
function taskView(task) { return { ...task, deadlineDisplay: new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }), statusLabel: labels[task.status], statusClass: task.status, canCancel: ['todo', 'ongoing'].includes(task.status), canStart: task.status === 'todo', canFinish: task.status === 'ongoing', canFail: ['todo', 'ongoing'].includes(task.status) }; }
async function receiverOptions(selected) { return (await User.find({ role: 'receiver' }).select('name email').sort({ name: 1 }).lean()).map(u => ({ ...u, selected: String(u._id) === String(selected || '') })); }
function parseForm(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const assignedReceiver = typeof body.assignedReceiver === 'string' ? body.assignedReceiver : '';
  const deadline = typeof body.deadline === 'string' ? body.deadline : '';
  const status = typeof body.status === 'string' ? body.status : 'todo';
  const values = { title, description, deadline, assignedReceiver, status };
  if (!title || title.length > 150 || !description || description.length > 5000 || !mongoose.isValidObjectId(assignedReceiver) || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return { error: 'Please complete all fields with valid values.', values };
  const parsed = new Date(`${deadline}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== deadline) return { error: 'Enter a valid deadline.', values };
  return { values: { ...values, deadline: parsed } };
}
async function renderForm(res, mode, values = {}, error, statusCode = 200) {
  const edit = mode === 'edit';
  return res.status(statusCode).render('admin/task-form', { title: edit ? 'Edit task' : 'Create task', edit, task: { ...values, deadline: dateInput(values.deadline) }, receivers: await receiverOptions(values.assignedReceiver), error, statusLabel: labels[values.status], transitions: (allowed[values.status] || []).map(value => ({ value, label: labels[value] })) });
}
const notFound = res => res.status(404).render('not-found', { title: 'Task not found' });
const conflict = res => res.status(409).render('error', { title: 'Task update rejected', message: 'The task has expired, changed, or reached a terminal status. Reload and try again.' });
router.get('/tasks', async (req, res, next) => { try { await expireTasks(); const tasks = await Task.find().populate('assignedReceiver', 'name email').sort({ createdAt: -1 }).lean(); res.render('admin/tasks', { title: 'All tasks', tasks: tasks.map(taskView), hasTasks: tasks.length > 0 }); } catch (err) { next(err); } });
router.get('/tasks/new', async (req, res, next) => { try { await renderForm(res, 'new'); } catch (err) { next(err); } });
router.post('/tasks', async (req, res, next) => { try {
  const { values, error } = parseForm(req.body);
  if (error) return renderForm(res, 'new', values, error, 400);
  if (values.deadline < todayUTC()) return renderForm(res, 'new', values, 'Deadline cannot be in the past.', 400);
  if (!await User.exists({ _id: values.assignedReceiver, role: 'receiver' })) return renderForm(res, 'new', values, 'Select an existing receiver.', 400);
  await Task.create({ ...values, status: 'todo', createdBy: req.user._id });
  res.redirect('/admin/tasks');
} catch (err) { next(err); } });
router.get('/tasks/:id/edit', async (req, res, next) => { try { if (!mongoose.isValidObjectId(req.params.id)) return notFound(res); await expireTasks(); const task = await Task.findById(req.params.id).lean(); if (!task) return notFound(res); await renderForm(res, 'edit', { ...task, assignedReceiver: String(task.assignedReceiver) }); } catch (err) { next(err); } });
router.post('/tasks/:id/edit', async (req, res, next) => { try {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  await expireTasks(); const task = await Task.findById(req.params.id); if (!task) return notFound(res);
  const { values, error } = parseForm(req.body);
  if (error) return renderForm(res, 'edit', { ...values, _id: task._id }, error, 400);
  if (values.deadline < todayUTC() && !TERMINAL.includes(task.status)) return renderForm(res, 'edit', { ...values, _id: task._id }, 'Deadline cannot be in the past.', 400);
  if (!await User.exists({ _id: values.assignedReceiver, role: 'receiver' })) return renderForm(res, 'edit', { ...values, _id: task._id }, 'Select an existing receiver.', 400);
  const reassigned = String(task.assignedReceiver) !== values.assignedReceiver;
  if (reassigned && TERMINAL.includes(task.status)) return conflict(res);
  // Compare-and-swap protects against stale concurrent edits and deadline races.
  const filter = { _id: task._id, __v: task.__v, status: task.status };
  if (!TERMINAL.includes(task.status)) filter.deadline = { $gte: todayUTC() };
  const update = { title: values.title, description: values.description, deadline: values.deadline, assignedReceiver: values.assignedReceiver };
  if (reassigned) update.status = 'todo';
  else if (!TERMINAL.includes(task.status) && values.deadline < todayUTC()) update.status = 'failed';
  const changed = await Task.findOneAndUpdate(filter, { $set: update, $inc: { __v: 1 } }, { new: true, runValidators: true });
  if (!changed) return conflict(res);
  res.redirect('/admin/tasks');
} catch (err) { next(err); } });
router.post('/tasks/:id/status', async (req, res, next) => { try {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  await expireTasks();
  const updated = await transitionTask(req.params.id, req.body.status);
  if (!updated) return conflict(res);
  res.redirect('/admin/tasks');
} catch (err) { next(err); } });
router.post('/tasks/:id/cancel', async (req, res, next) => { try {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  await expireTasks(); if (!await transitionTask(req.params.id, 'cancelled')) return conflict(res);
  res.redirect('/admin/tasks');
} catch (err) { next(err); } });
module.exports = router;
