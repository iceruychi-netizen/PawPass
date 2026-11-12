'use strict';
/* Creates the tables from db/schema.sql. Usage: npm run db:migrate (reads DATABASE_URL). */
require('../server/env').load();
const fs = require('fs');
const path = require('path');
const db = require('../server/db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await db.query(sql);
  const rows = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Schema ready:', rows.map((r) => r.table_name).join(', '));
  process.exit(0);
})().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
