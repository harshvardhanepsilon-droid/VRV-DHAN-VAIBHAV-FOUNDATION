const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('express-async-errors');
const express = require('express');
const cors = require('cors');

const { ensureSchema } = require('./src/db');
const customersRouter = require('./src/routes/customers');
const loansRouter = require('./src/routes/loans');
const dashboardRouter = require('./src/routes/dashboard');
const configRouter = require('./src/routes/config');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/customers', customersRouter);
app.use('/api/loans', loansRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/config', configRouter);

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
