const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireRole, requireOwnerOrStaff } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const getOwner = async (req) => { const { rows } = await db.query('SELECT customer_id FROM subscriptions WHERE id = $1', [req.params.id]); return rows[0]?.customer_id; };

router.get('/', authenticate, async (req, res) => {
  try {
    const isCust = req.user.role === 'customer';
    const { state, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let cond = [], params = [], i = 1;
    if (isCust) { cond.push(`s.customer_id = $${i++}`); params.push(req.user.id); }
    if (state) { cond.push(`s.state = $${i++}`); params.push(state); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const countRes = await db.query(`SELECT COUNT(*) FROM subscriptions s ${where}`, params);
    params.push(parseInt(limit), offset);
    const { rows } = await db.query(
      `SELECT s.id, s.sequence_number, s.state, s.start_date, s.expiry_date, s.next_invoice_date, s.payment_terms,
              u.full_name AS customer_name, u.email AS customer_email, rp.name AS plan_name, rp.frequency, rp.price AS plan_price
       FROM subscriptions s JOIN users u ON u.id = s.customer_id JOIN recurring_plans rp ON rp.id = s.plan_id
       ${where} ORDER BY s.created_at DESC LIMIT $${i++} OFFSET $${i++}`, params);
    res.json({ data: rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', authenticate, requireOwnerOrStaff(getOwner), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.full_name AS customer_name, u.email AS customer_email, rp.name AS plan_name, rp.frequency, rp.price AS plan_price
       FROM subscriptions s JOIN users u ON u.id = s.customer_id JOIN recurring_plans rp ON rp.id = s.plan_id WHERE s.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const lines = await db.query(`SELECT sl.*, p.name AS product_name, pv.attribute, pv.value AS variant_value FROM subscription_lines sl JOIN products p ON p.id=sl.product_id LEFT JOIN product_variants pv ON pv.id=sl.variant_id WHERE sl.subscription_id=$1 ORDER BY sl.sort_order`, [req.params.id]);
    res.json({ ...rows[0], lines: lines.rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', authenticate, requireRole('admin','staff'), [
  body('customer_id').isUUID(), body('plan_id').isUUID(), body('start_date').isISO8601(), body('lines').isArray({ min: 1 }),
  handleValidationErrors,
], async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { customer_id, plan_id, start_date, expiry_date, payment_terms, lines } = req.body;
    const seq = `SUB-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*9000+1000)}`;
    const { rows: planRows } = await client.query('SELECT frequency FROM recurring_plans WHERE id = $1', [plan_id]);
    const freq = planRows[0]?.frequency || 'monthly';
    const iv = { daily: '1 day', weekly: '1 week', monthly: '1 month', yearly: '1 year' }[freq];
    const { rows: nr } = await client.query(`SELECT ($1::date + INTERVAL '${iv}')::date AS d`, [start_date]);
    const { rows: sub } = await client.query(
      `INSERT INTO subscriptions (sequence_number, customer_id, plan_id, start_date, expiry_date, next_invoice_date, payment_terms, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [seq, customer_id, plan_id, start_date, expiry_date || null, nr[0].d, payment_terms || 'Net 30', req.user.id]);
    const subId = sub[0].id;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await client.query(`INSERT INTO subscription_lines (subscription_id, product_id, variant_id, quantity, unit_price, tax_rule_id, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [subId, l.product_id, l.variant_id || null, l.quantity, l.unit_price, l.tax_rule_id || null, i]);
    }
    await client.query('COMMIT');
    res.status(201).json(sub[0]);
  } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ error: 'Failed to create subscription' }); }
  finally { client.release(); }
});

router.patch('/:id/state', authenticate, requireRole('admin','staff'), [
  body('state').isIn(['sent','confirmed','active','closed']),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE subscriptions SET state=$1, close_reason=$2, updated_at=NOW() WHERE id=$3 RETURNING *', [req.body.state, req.body.close_reason || null, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'State update failed' }); }
});

module.exports = router;
