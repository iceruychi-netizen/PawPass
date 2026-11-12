'use strict';
/*
 * PostgreSQL access. One small pool per (serverless) instance, created lazily.
 * The schema (CREATE TABLE IF NOT EXISTS …) is applied once per instance on first use,
 * so a fresh Neon / Vercel Postgres database works without a manual migration step.
 */
const SCHEMA = require('./schema');

let pool = null;
let schemaReady = null;

/** Vercel's Neon / Postgres integrations name the variable differently depending on setup. */
function connectionString() {
  const keys = ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING'];
  for (const k of keys) if (process.env[k]) return process.env[k];
  // Integrations created with a custom prefix, e.g. STORAGE_DATABASE_URL / MYDB_POSTGRES_URL
  const k = Object.keys(process.env).find((n) => /(_DATABASE_URL|_POSTGRES_URL)$/.test(n) && /^postgres(ql)?:\/\//.test(process.env[n]));
  return k ? process.env[k] : '';
}

function configError(message) { const e = new Error(message); e.code = 'PAWPASS_NO_DB_URL'; return e; }

function getPool() {
  if (pool) return pool;
  const url = connectionString();
  if (!url) throw configError('DATABASE_URL is not set (no PostgreSQL connection string found in the environment)');
  if (process.env.PAWPASS_DB_DRIVER === 'psql') { process.env.DATABASE_URL = url; pool = require('../scripts/psql-driver'); return pool; } // dev/test only
  const pg = require('pg');
  // DATE → 'YYYY-MM-DD' string (no timezone shifting); NUMERIC → number.
  pg.types.setTypeParser(1082, (v) => v);
  pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  pool = new pg.Pool({
    connectionString: url,
    ssl: local || process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
    max: Number(process.env.PG_POOL_MAX || 3),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000
  });
  pool.on('error', (e) => console.error('[db] idle client error', e.message));
  return pool;
}

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(SCHEMA).catch((e) => {
      // Two cold starts creating the same table at once: the other one won, which is fine.
      if (e && (e.code === '23505' || e.code === '42P07')) return;
      schemaReady = null; // retry on the next request
      throw e;
    });
  }
  return schemaReady;
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
  await ensureSchema();
  const r = await getPool().query(text, params || []);
  return (r.rows || []).map(normalize);
}
async function one(text, params) { return (await query(text, params))[0] || null; }

/** Connection / configuration problems (as opposed to bugs) — shown to the user as "database unavailable". */
function isConnectionError(err) {
  if (!err) return false;
  if (err.code === 'PAWPASS_NO_DB_URL') return true;
  if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', '28P01', '28000', '3D000', '57P01', '53300'].indexOf(err.code) >= 0) return true;
  return /connect|Connection terminated|timeout|password authentication|does not exist.*database|SSL/i.test(String(err.message || ''));
}

module.exports = { query, one, isConnectionError, connectionString, schemaSql: SCHEMA };
