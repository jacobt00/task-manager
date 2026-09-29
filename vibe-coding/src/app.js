require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const { engine } = require('express-handlebars');
const connectDatabase = require('./config/database');
const indexRoutes = require('./routes');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false })); // Configure a strict CSP before production.
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.engine('hbs', engine({ extname: '.hbs', defaultLayout: 'main', layoutsDir: path.join(__dirname, '..', 'views', 'layouts'), partialsDir: path.join(__dirname, '..', 'views', 'partials') }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use('/', indexRoutes);
app.use((req, res) => res.status(404).render('not-found', { title: 'Page not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Server error' });
});

async function start() {
  await connectDatabase();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Task Manager: http://localhost:${port}`));
}
if (require.main === module) start().catch(err => { console.error('Startup failed:', err.message); process.exit(1); });
module.exports = app;
