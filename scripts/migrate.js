'use strict';
/*
 * Creates the tables (db/schema.sql). Optional: the API also applies the schema automatically
 * on its first request. Usage: npm run db:migrate (reads DATABASE_URL).
 */
require('../server/env').load();
const db = require('../server/db');

(async () => {
  const rows = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Schema ready:', rows.map((r) => r.table_name).join(', '));
  process.exit(0);
})().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
