const { Router } = require('express');
const {
  SESSION_TTL_MS,
  createUser,
  createSession,
  deleteSession,
  getUserByEmail,
  normalizeEmail,
  verifyPassword
} = require('../utils/authStore');

const router = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  path: '/',
  maxAge: SESSION_TTL_MS
};

router.post('/sign-up', (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    const normalizedEmail = normalizeEmail(email);
    const existing = getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    const user = createUser({ name, email: normalizedEmail, password });
    const session = createSession(user.id);
    res.cookie('wt_session', session.token, cookieOptions);
    return res.status(201).json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create account.' });
  }
});

router.post('/sign-in', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const userRow = getUserByEmail(email);
    if (!userRow || !verifyPassword(userRow, password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const session = createSession(userRow.id);
    res.cookie('wt_session', session.token, cookieOptions);
    return res.json({ user: { id: userRow.id, name: userRow.name, email: userRow.email } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to sign in.' });
  }
});

router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.json({ user: req.user });
});

router.post('/logout', (req, res) => {
  const token = req.cookies?.wt_session;
  if (token) {
    deleteSession(token);
  }
  res.clearCookie('wt_session', cookieOptions);
  return res.json({ ok: true });
});

module.exports = router;
