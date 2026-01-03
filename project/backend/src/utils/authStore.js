const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('../db');

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const nowIso = () => new Date().toISOString();

const normalizeEmail = (email) => email.trim().toLowerCase();

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function createUser({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = bcrypt.hashSync(password, 10);
  const insert = db.prepare(
    `INSERT INTO users (name, email, password_hash, created_at)
     VALUES (?, ?, ?, ?)`
  );
  const result = insert.run(name.trim(), normalizedEmail, passwordHash, nowIso());
  return getUserById(result.lastInsertRowid);
}

function getUserById(id) {
  return db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(id);
}

function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
}

function verifyPassword(userRow, password) {
  if (!userRow) return false;
  return bcrypt.compareSync(password, userRow.password_hash);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO sessions (user_id, token_hash, created_at, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(userId, tokenHash, createdAt, expiresAt);
  return { token, expiresAt };
}

function deleteSession(token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

function getUserBySession(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      `SELECT s.expires_at, u.id, u.name, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash);
  if (!row) return null;
  const expiresAt = Date.parse(row.expires_at);
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  return { id: row.id, name: row.name, email: row.email };
}

module.exports = {
  SESSION_TTL_MS,
  normalizeEmail,
  createUser,
  getUserByEmail,
  verifyPassword,
  createSession,
  deleteSession,
  getUserBySession
};
