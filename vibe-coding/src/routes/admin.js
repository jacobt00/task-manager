const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');
const { requireAdmin } = require('../middleware/auth');
const { expireTasks } = require('../services/tasks');
const router = express.Router();
router.use(requireAdmin);
router.get('/dashboard', async (req, res, next) => { try { await expireTasks(); res.render('dashboard/admin', { title: 'Admin dashboard', userCount: await User.countDocuments(), taskCount: await Task.countDocuments(), todoCount: await Task.countDocuments({ status: 'todo' }), doneCount: await Task.countDocuments({ status: 'done' }) }); } catch (err) { next(err); } });
router.get('/users/new', (req, res) => res.render('admin/new-user', { title: 'Create user' }));
router.post('/users', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    const role = req.body.role;
    if (!name || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72 || !['admin', 'receiver'].includes(role)) return res.status(400).render('admin/new-user', { title: 'Create user', error: 'Check all fields. Password must be at least 12 characters (max 72 UTF-8 bytes).', name, email });
    await User.create({ name, email, role, passwordHash: await User.hashPassword(password) });
    res.redirect('/admin/dashboard');
  } catch (err) { if (err.code === 11000) return res.status(400).render('admin/new-user', { title: 'Create user', error: 'Email already exists.' }); next(err); }
});
module.exports = router;
