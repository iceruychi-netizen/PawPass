'use strict';
/* Password hashing (scrypt, node:crypto) and JWT (HS256) — no third-party crypto. */
const crypto = require('crypto');

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const TOKEN_TTL_SECONDS = 7 * 24 * 3600;

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 },
      (err, key) => (err ? reject(err) : resolve(key)));
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  const key = await new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, expected.length, { N: Number(parts[1]), r: Number(parts[2]), p: Number(parts[3]), maxmem: 64 * 1024 * 1024 },
      (err, k) => (err ? reject(err) : resolve(k)));
  });
  return crypto.timingSafeEqual(key, expected);
}

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET must be set (at least 32 characters)');
  return s;
}
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const fromB64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function signToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ sub: String(userId), iat: now, exp: now + TOKEN_TTL_SECONDS }));
  const sig = b64url(crypto.createHmac('sha256', secret()).update(head + '.' + body).digest());
  return head + '.' + body + '.' + sig;
}

/** Returns the user id, or null when the token is missing, forged, malformed or expired. */
function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const expected = crypto.createHmac('sha256', secret()).update(parts[0] + '.' + parts[1]).digest();
  const given = fromB64url(parts[2]);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const head = JSON.parse(fromB64url(parts[0]).toString('utf8'));
    if (head.alg !== 'HS256') return null;
    const p = JSON.parse(fromB64url(parts[1]).toString('utf8'));
    if (!p.exp || p.exp < Math.floor(Date.now() / 1000)) return null;
    const id = Number(p.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch (e) { return null; }
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, TOKEN_TTL_SECONDS };
