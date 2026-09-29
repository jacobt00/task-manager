const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { requireAuth } = require('../middleware/auth');
const { expireTasks, transitionTask } = require('../services/tasks');
const router = express.Router();
router.get('/', (req, res) => res.render('home', { title: 'Home', activeHome: true }));
router.get('/dashboard', requireAuth, (req, res) => res.redirect(req.user.role === 'admin' ? '/admin/dashboard' : '/receiver/dashboard'));
router.get('/receiver/dashboard', requireAuth, async (req, res, next) => { try {
  if (req.user.role !== 'receiver') return res.redirect('/admin/dashboard');
  await expireTasks();
  const tasks = await Task.find({ assignedReceiver: req.user._id }).sort({ createdAt: -1 }).lean();
  res.render('dashboard/receiver', { title: 'My dashboard', tasks: tasks.map(t => ({ ...t, canCancel: ['todo', 'ongoing'].includes(t.status), canStart: t.status === 'todo', canFinish: t.status === 'ongoing', canFail: ['todo', 'ongoing'].includes(t.status), deadlineDisplay: t.deadline.toISOString().slice(0, 10) })) });
} catch (err) { next(err); } });
router.post('/receiver/tasks/:id/status', requireAuth, async (req, res, next) => { try {
  if (req.user.role !== 'receiver') return res.status(403).render('error', { title: 'Access denied', message: 'Receiver access required.' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).render('not-found', { title: 'Task not found' });
  await expireTasks();
  if (!await transitionTask(req.params.id, req.body.status, { assignedReceiver: req.user._id })) return res.status(409).render('error', { title: 'Task update rejected', message: 'Task is unavailable, expired or cannot make that transition.' });
  res.redirect('/receiver/dashboard');
} catch (err) { next(err); } });
router.post('/receiver/tasks/:id/cancel', requireAuth, async (req, res, next) => { try {
  if (req.user.role !== 'receiver') return res.status(403).render('error', { title: 'Access denied', message: 'Receiver access required.' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).render('not-found', { title: 'Task not found' });
  await expireTasks();
  if (!await transitionTask(req.params.id, 'cancelled', { assignedReceiver: req.user._id })) return res.status(409).render('error', { title: 'Task update rejected', message: 'Task is unavailable, expired or already terminal.' });
  res.redirect('/receiver/dashboard');
} catch (err) { next(err); } });
module.exports = router;
