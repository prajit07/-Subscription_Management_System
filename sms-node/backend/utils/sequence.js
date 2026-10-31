const db = require('../config/database');
async function nextSequence(prefix) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const table = prefix === 'INV' ? 'invoices' : 'subscriptions';
  const col = prefix === 'INV' ? 'invoice_number' : 'sequence_number';
  const like = `${prefix}-${date}-%`;
  const { rows } = await db.query(`SELECT COUNT(*) AS cnt FROM ${table} WHERE ${col} LIKE $1`, [like]);
  const n = parseInt(rows[0].cnt, 10) + 1;
  return `${prefix}-${date}-${String(n).padStart(4, '0')}`;
}
module.exports = { nextSequence };
