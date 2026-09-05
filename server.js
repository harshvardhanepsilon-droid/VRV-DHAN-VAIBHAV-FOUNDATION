const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('express-async-errors');
const express = require('express');
const cookieParser = require('cookie-parser');

const { ensureSchema } = require('./src/db');
const { requireAuthApi, requireAuthPage } = require('./src/middleware/auth');
const authRouter = require('./src/routes/auth');
const customersRouter = require('./src/routes/customers');
const loansRouter = require('./src/routes/loans');
const dashboardRouter = require('./src/routes/dashboard');
const configRouter = require('./src/routes/config');

const app = express();
// Render terminates TLS at its own proxy in front of this app; trusting it
// lets Express read X-Forwarded-Proto correctly for secure cookies.
app.set('trust proxy', 1);
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Auth endpoints and static assets (CSS/JS/icons — no customer data in them)
// stay reachable without a session so the login page itself can load.
app.use('/api/auth', authRouter);
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

// Everything else — the API and every other page — requires a session.
app.use('/api/customers', requireAuthApi, customersRouter);
app.use('/api/loans', requireAuthApi, loansRouter);
app.use('/api/dashboard', requireAuthApi, dashboardRouter);
app.use('/api/config', requireAuthApi, configRouter);

app.use(requireAuthPage);
app.use(express.static(path.join(__dirname, 'public')));

// Route error fallback (async route errors, multer errors, etc.) so failures
// return JSON instead of an HTML stack trace or a hung connection.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || 'Request failed' });
});

const PORT = process.env.PORT || 4100;

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`VRV Dhan Vaibhav Foundation CRM running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });
