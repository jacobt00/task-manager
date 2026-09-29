const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { guestOnly, requireAuth } = require('../middleware/auth');
const router = express.Router();
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: 'Too many attempts. Try again later.' });
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPassword = value => typeof value === 'string' && value.length >= 12 && Buffer.byteLength(value, 'utf8') <= 72;
const normalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
function establishSession(req, user, next) {
  req.session.regenerate(err => {
    if (err) return next(err);
    req.session.userId = String(user._id);
    req.session.save(err => err ? next(err) : next());
  });
}
router.get('/register', guestOnly, (req, res) => res.render('auth/register', { title: 'Register' }));
router.post('/register', guestOnly, loginLimit, async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = normalize(req.body.email), password = req.body.password;
    if (!name || name.length > 100 || !validEmail(email) || !validPassword(password)) return res.status(400).render('auth/register', { title: 'Register', error: 'Enter a name, valid email and password of at least 12 characters (maximum 72 UTF-8 bytes).', name, email });
    const user = await User.create({ name, email, passwordHash: await User.hashPassword(password), role: 'receiver' });
    establishSession(req, user, next);
  } catch (err) {
    if (err.code === 11000) return res.status(400).render('auth/register', { title: 'Register', error: 'This email is already registered.' });
    next(err);
  }
}, (req, res) => res.redirect('/dashboard'));
router.get('/login', guestOnly, (req, res) => res.render('auth/login', { title: 'Log in' }));
router.post('/login', guestOnly, loginLimit, async (req, res, next) => {
  try {
    const email = normalize(req.body.email), password = req.body.password;
    const user = validEmail(email) && typeof password === 'string' ? await User.findOne({ email }).select('+passwordHash') : null;
    if (!user || !(await user.verifyPassword(password))) return res.status(401).render('auth/login', { title: 'Log in', error: 'Invalid email or password.', email });
    establishSession(req, user, next);
  } catch (err) { next(err); }
}, (req, res) => res.redirect('/dashboard'));
router.post('/logout', requireAuth, (req, res, next) => req.session.destroy(err => { if (err) return next(err); res.clearCookie('taskflow.sid'); res.redirect('/'); }));
module.exports = router;
