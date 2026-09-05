const express = require('express');
const multer = require('multer');
const router = express.Router();
const { pool, logActivity } = require('../db');
const { compressLogo } = require('../utils/image');

const logoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
  limits: { fileSize: 3 * 1024 * 1024 }
});

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT company, logo_data FROM config WHERE id = 1');
  const company = { ...rows[0].company, logoDataUrl: rows[0].logo_data ? '/api/config/logo' : '' };
  res.json({ company });
});

router.get('/logo', async (req, res) => {
  const { rows } = await pool.query('SELECT logo_data, logo_mime FROM config WHERE id = 1');
  if (!rows[0].logo_data) return res.status(404).end();
  res.setHeader('Content-Type', rows[0].logo_mime || 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(rows[0].logo_data);
});

router.put('/company', async (req, res) => {
  const body = req.body || {};
  const { rows } = await pool.query('SELECT company FROM config WHERE id = 1');
  const company = { ...rows[0].company };
  const fields = [
    'name', 'tagline', 'address', 'city', 'state', 'pincode', 'regNo', 'pan', 'phone', 'email',
    'signatory', 'signatoryDesignation', 'defaultInterestType', 'jurisdiction'
  ];
  fields.forEach((f) => { if (body[f] !== undefined) company[f] = body[f]; });
  if (body.defaultInterestRatePct !== undefined) company.defaultInterestRatePct = Number(body.defaultInterestRatePct) || 0;
  if (body.penaltyPct !== undefined) company.penaltyPct = Number(body.penaltyPct) || 0;
  await pool.query('UPDATE config SET company = $1 WHERE id = 1', [company]);
  logActivity('config', null, 'updated', 'Updated company settings');
  const { rows: updated } = await pool.query('SELECT company, logo_data FROM config WHERE id = 1');
  res.json({ company: { ...updated[0].company, logoDataUrl: updated[0].logo_data ? '/api/config/logo' : '' } });
});

router.post('/company/logo', logoUpload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const compressed = await compressLogo(req.file.buffer);
  await pool.query('UPDATE config SET logo_data = $1, logo_mime = $2 WHERE id = 1', [compressed, 'image/png']);
  logActivity('config', null, 'logo_updated', 'Updated company logo');
  const { rows } = await pool.query('SELECT company, logo_data FROM config WHERE id = 1');
  res.json({ company: { ...rows[0].company, logoDataUrl: '/api/config/logo' } });
});

module.exports = router;
