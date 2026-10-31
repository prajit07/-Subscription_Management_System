const fs = require('fs');
const path = require('path');
const db = require('../backend/config/database');
async function migrate() {
  const sqlFile = path.join(__dirname, 'migrations', '001_initial_schema.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('[MIGRATE] Running schema...');
  await db.query(sql);
  console.log('[MIGRATE] Schema applied');
  process.exit(0);
}
migrate().catch(e => { console.error('[MIGRATE] FAILED:', e.message); process.exit(1); });
EOF