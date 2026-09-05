const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { issueSessionCookie, clearSessionCookie, isAuthenticated } = require('../middleware/auth');
const { logActivity } = require('../db');

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
if (!ADMIN_PASSWORD_HASH) {
  throw new Error('ADMIN_PASSWORD_HASH is not set. Generate one with bcryptjs and set it as an env var.');
}

router.post('/login', async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Password is required' });
  const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: 'Incorrect password' });
  issueSessionCookie(res);
  logActivity('auth', null, 'login', 'Signed in');
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/status', (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

module.exports = router;
