const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const customersRouter = require('./src/routes/customers');
const loansRouter = require('./src/routes/loans');
const dashboardRouter = require('./src/routes/dashboard');
const configRouter = require('./src/routes/config');

const UPLOAD_ROOT = path.join(__dirname, 'uploads');
['photos', 'documents'].forEach((dir) => fs.mkdirSync(path.join(UPLOAD_ROOT, dir), { recursive: true }));

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(UPLOAD_ROOT));

app.use('/api/customers', customersRouter);
app.use('/api/loans', loansRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/config', configRouter);

// Multer / route error fallback so a bad upload returns JSON instead of an HTML stack trace.
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || 'Request failed' });
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 4100;
app.listen(PORT, () => {
  console.log(`VRV Dhan Vaibhav Foundation CRM running at http://localhost:${PORT}`);
});
