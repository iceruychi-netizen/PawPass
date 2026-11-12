'use strict';
/*
 * DEV/TEST ONLY — a stand-in for the `pg` Pool that shells out to the `psql` CLI.
 * Used when `pg` cannot be installed (offline sandbox). Production always uses `pg`.
 * Enable with PAWPASS_DB_DRIVER=psql.
 */
const { spawn } = require('child_process');

function run(sql, vars) {
  return new Promise((resolve, reject) => {
    const args = [process.env.DATABASE_URL, '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'];
    Object.keys(vars).forEach((k) => { args.push('-v', k + '=' + vars[k]); });
    args.push('-f', '-');
    const p = spawn('psql', args, { env: Object.assign({}, process.env, { PGCLIENTENCODING: 'UTF8' }) });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) return resolve(out);
      const e = new Error(err.trim() || 'psql failed');
      if (/duplicate key/.test(err)) e.code = '23505';
      if (/violates foreign key/.test(err)) e.code = '23503';
      if (/violates check constraint/.test(err)) e.code = '23514';
      reject(e);
    });
    p.stdin.end(sql);
  });
}

module.exports = {
  async query(text, params) {
    params = params || [];
    const vars = {};
    let sql = String(text).replace(/\$(\d+)/g, (_, n) => {
      const v = params[Number(n) - 1];
      if (v === null || v === undefined) return 'NULL';
      vars['p' + n] = String(v);
      return ":'p" + n + "'";
    });
    const head = sql.trim().slice(0, 6).toUpperCase();
    const returning = /\bRETURNING\b/i.test(sql);
    if (head === 'SELECT' || head.startsWith('WITH')) sql = "SELECT coalesce(json_agg(t), '[]'::json) FROM (" + sql + ') t;';
    else if (returning) sql = "WITH t AS (" + sql + ") SELECT coalesce(json_agg(t), '[]'::json) FROM t;";
    else sql = sql.trim().replace(/;?$/, ';');
    const out = (await run(sql, vars)).trim();
    const rows = out && (head === 'SELECT' || head.startsWith('WITH') || returning) ? JSON.parse(out) : [];
    return { rows, rowCount: rows.length };
  }
};
