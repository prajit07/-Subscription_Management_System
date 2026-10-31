const fs = require('fs');
const path = require('path');
const db = require('../backend/config/database');
async function seed() {
  const sqlFile = path.join(__dirname, 'seeds', '001_seed_data.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('[SEED] Seeding...');
  await db.query(sql);
  console.log('[SEED] Done');
  process.exit(0);
}
seed().catch(e => { console.error('[SEED] FAILED:', e.message); process.exit(1); });
EOF