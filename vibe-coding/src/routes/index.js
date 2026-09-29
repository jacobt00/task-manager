const router = require('express').Router();
router.get('/', (req, res) => res.render('home', { title: 'Welcome', activeHome: true }));
router.get('/health', (req, res) => res.json({ status: 'ok' }));
module.exports = router;
