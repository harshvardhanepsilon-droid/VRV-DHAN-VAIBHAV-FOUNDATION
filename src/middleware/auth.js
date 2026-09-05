const jwt = require('jsonwebtoken');

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not set. Set it to a long random string.');
}

// Render terminates TLS at its own proxy, so the cookie's `secure` flag is
// keyed off the RENDER env var (set automatically there) rather than
// req.protocol, which would otherwise see plain HTTP from the proxy hop.
const COOKIE_SECURE = !!process.env.RENDER;

function issueSessionCookie(res) {
  const token = jwt.sign({ role: 'staff' }, SESSION_SECRET, { expiresIn: '30d' });
  res.cookie('session', token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookie(res) {
  res.clearCookie('session', { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'lax' });
}

function isAuthenticated(req) {
  const token = req.cookies && req.cookies.session;
  if (!token) return false;
  try {
    jwt.verify(token, SESSION_SECRET);
    return true;
  } catch (e) {
    return false;
  }
}

function requireAuthApi(req, res, next) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

function requireAuthPage(req, res, next) {
  if (!isAuthenticated(req)) return res.redirect('/login.html');
  next();
}

module.exports = { issueSessionCookie, clearSessionCookie, isAuthenticated, requireAuthApi, requireAuthPage };
