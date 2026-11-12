'use strict';
/* PostgreSQL access. One small pool per (serverless) instance, created lazily. */

let pool = null;

function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  if (process.env.PAWPASS_DB_DRIVER === 'psql') { pool = require('../scripts/psql-driver'); return pool; } // dev/test only
  const pg = require('pg');
  // DATE → 'YYYY-MM-DD' string (no timezone shifting); NUMERIC → number.
  pg.types.setTypeParser(1082, (v) => v);
  pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  pool = new pg.Pool({
    connectionString: url,
    ssl: local || process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
    max: Number(process.env.PG_POOL_MAX || 3),
    idleTimeoutMillis: 10000
  });
  return pool;
}

const TS = ['created_at', 'updated_at', 'uploaded_at'];
const DATES = ['date_of_birth', 'examination_date', 'vaccination_date'];

/** Same row shape whichever driver produced it: ISO timestamps, plain dates, numeric weight. */
function normalize(row) {
  const o = Object.assign({}, row);
  TS.forEach((k) => { if (o[k] != null) o[k] = new Date(o[k]).toISOString(); });
  DATES.forEach((k) => { if (o[k] != null) o[k] = String(o[k] instanceof Date ? o[k].toISOString() : o[k]).slice(0, 10); });
  if (o.weight != null) o.weight = Number(o.weight);
  return o;
}

async function query(text, params) {
  const r = await getPool().query(text, params || []);
  return (r.rows || []).map(normalize);
}
async function one(text, params) { return (await query(text, params))[0] || null; }

/** Test hook: swap in another driver exposing query(text, params) → {rows}. */
function _setPool(p) { pool = p; }

module.exports = { query, one, _setPool };
