const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.get('/', (req, res) => res.render('home', { title: 'Home', activeHome: true }));
router.get('/dashboard', requireAuth, (req, res) => res.redirect(req.user.role === 'admin' ? '/admin/dashboard' : '/receiver/dashboard'));
router.get('/receiver/dashboard', requireAuth, (req, res) => {
  if (req.user.role !== 'receiver') return res.redirect('/admin/dashboard');
  res.render('dashboard/receiver', { title: 'My dashboard' });
});
module.exports = router;
