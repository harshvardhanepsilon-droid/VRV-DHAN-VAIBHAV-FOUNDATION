const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { readDB, writeDB } = require('../db');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_ROOT, 'photos')),
    filename: (req, file, cb) => cb(null, `logo-${Date.now()}${path.extname(file.originalname) || '.png'}`)
  }),
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
  limits: { fileSize: 3 * 1024 * 1024 }
});

router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.config);
});

router.put('/company', (req, res) => {
  const db = readDB();
  const body = req.body || {};
  const fields = [
    'name', 'tagline', 'address', 'city', 'state', 'pincode', 'regNo', 'pan', 'phone', 'email',
    'signatory', 'signatoryDesignation', 'defaultInterestRatePct', 'defaultInterestType', 'penaltyPct', 'jurisdiction'
  ];
  fields.forEach((f) => { if (body[f] !== undefined) db.config.company[f] = body[f]; });
  if (body.defaultInterestRatePct !== undefined) db.config.company.defaultInterestRatePct = Number(body.defaultInterestRatePct) || 0;
  if (body.penaltyPct !== undefined) db.config.company.penaltyPct = Number(body.penaltyPct) || 0;
  writeDB(db);
  res.json(db.config);
});

router.post('/company/logo', logoUpload.single('logo'), (req, res) => {
  const db = readDB();
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  db.config.company.logoDataUrl = `/uploads/photos/${req.file.filename}`;
  writeDB(db);
  res.json(db.config);
});

module.exports = router;
