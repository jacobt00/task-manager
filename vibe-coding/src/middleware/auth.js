const crypto = require('crypto');
const User = require('../models/User');
function csrfToken(req) { if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex'); return req.session.csrfToken; }
function verifyCsrf(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const supplied = req.body?._csrf || req.get('x-csrf-token');
  const expected = req.session.csrfToken;
  if (!supplied || !expected || supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return res.status(403).render('error', { title: 'Invalid request', message: 'Security token expired. Reload the form and try again.' });
  next();
}
async function loadUser(req, res, next) {
  try {
    req.user = null;
    if (req.session.userId) {
      req.user = await User.findById(req.session.userId).select('name email role').lean();
      if (!req.user) req.session.userId = null;
    }
    res.locals.currentUser = req.user;
    res.locals.csrfToken = csrfToken(req);
    next();
  } catch (err) { next(err); }
}
function requireAuth(req, res, next) { if (!req.user) return res.redirect('/login'); next(); }
function requireAdmin(req, res, next) { if (!req.user) return res.redirect('/login'); if (req.user.role !== 'admin') return res.status(403).render('error', { title: 'Access denied', message: 'This page is for administrators only.' }); next(); }
function guestOnly(req, res, next) { if (req.user) return res.redirect('/dashboard'); next(); }
module.exports = { loadUser, requireAuth, requireAdmin, guestOnly, verifyCsrf };
