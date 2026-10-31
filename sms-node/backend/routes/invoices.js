const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireRole, requireOwnerOrStaff } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const getOwner = async (req) => { const { rows } = await db.query('SELECT customer_id FROM invoices WHERE id = $1', [req.params.id]); return rows[0]?.customer_id; };

router.get('/', authenticate, async (req, res) => {
  try {
    const isCust = req.user.role === 'customer';
    const { state, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let cond = [], params = [], i = 1;
    if (isCust) { cond.push(`i.customer_id = $${i++}`); params.push(req.user.id); }
    if (state) { cond.push(`i.state = $${i++}`); params.push(state); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const countRes = await db.query(`SELECT COUNT(*) FROM invoices i ${where}`, params);
    params.push(parseInt(limit), offset);
    const { rows } = await db.query(
      `SELECT i.*, u.full_name AS customer_name, u.email AS customer_email, s.sequence_number AS subscription_number
       FROM invoices i JOIN users u ON u.id=i.customer_id JOIN subscriptions s ON s.id=i.subscription_id
       ${where} ORDER BY i.issue_date DESC LIMIT $${i++} OFFSET $${i++}`, params);
    res.json({ data: rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', authenticate, requireOwnerOrStaff(getOwner), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*, u.full_name AS customer_name, u.email AS customer_email, s.sequence_number AS subscription_number
       FROM invoices i JOIN users u ON u.id=i.customer_id JOIN subscriptions s ON s.id=i.subscription_id WHERE i.id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const lines = await db.query(`SELECT il.*, p.name AS product_name FROM invoice_lines il JOIN products p ON p.id=il.product_id WHERE il.invoice_id=$1 ORDER BY il.sort_order`, [req.params.id]);
    const payments = await db.query('SELECT * FROM payments WHERE invoice_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json({ ...rows[0], lines: lines.rows, payments: payments.rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', authenticate, requireRole('admin','staff'), [body('subscription_id').isUUID(), handleValidationErrors], async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { subscription_id } = req.body;
    const { rows: subs } = await client.query(`SELECT s.*, rp.frequency FROM subscriptions s JOIN recurring_plans rp ON rp.id=s.plan_id WHERE s.id=$1 AND s.state='active'`, [subscription_id]);
    if (!subs.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Subscription not active' }); }
    const sub = subs[0];
    const { rows: lines } = await client.query(`SELECT sl.*, p.name AS product_name, tr.rate AS tax_rate FROM subscription_lines sl JOIN products p ON p.id=sl.product_id LEFT JOIN tax_rules tr ON tr.id=sl.tax_rule_id WHERE sl.subscription_id=$1`, [subscription_id]);
    let subtotal = 0, taxTotal = 0;
    const invLines = lines.map((l, idx) => {
      const base = parseFloat(l.unit_price) * parseFloat(l.quantity);
      const tax = +(base * parseFloat(l.tax_rate || 0) / 100).toFixed(2);
      subtotal += base; taxTotal += tax;
      return { ...l, line_total: +(base + tax).toFixed(2), tax_amount: tax, sort_order: idx };
    });
    const total = +(subtotal + taxTotal).toFixed(2);
    const invNum = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*9000+1000)}`;
    const due = new Date(); due.setDate(due.getDate() + 30);
    const { rows: inv } = await client.query(
      `INSERT INTO invoices (invoice_number, subscription_id, customer_id, issue_date, due_date, subtotal, tax_amount, total) VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7) RETURNING *`,
      [invNum, subscription_id, sub.customer_id, due.toISOString().slice(0,10), subtotal, taxTotal, total]);
    for (const l of invLines) {
      await client.query(`INSERT INTO invoice_lines (invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, line_total, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [inv[0].id, l.product_id, l.product_name, l.quantity, l.unit_price, l.tax_rate || 0, l.tax_amount, l.line_total, l.sort_order]);
    }
    const iv = { daily: '1 day', weekly: '1 week', monthly: '1 month', yearly: '1 year' }[sub.frequency];
    await client.query(`UPDATE subscriptions SET next_invoice_date = (next_invoice_date + INTERVAL '${iv}')::date, updated_at=NOW() WHERE id=$1`, [subscription_id]);
    await client.query('COMMIT');
    res.status(201).json(inv[0]);
  } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ error: 'Invoice generation failed' }); }
  finally { client.release(); }
});

router.patch('/:id/state', authenticate, requireRole('admin','staff'), [body('state').isIn(['confirmed','sent','cancelled']), handleValidationErrors], async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE invoices SET state=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [req.body.state, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'State update failed' }); }
});

module.exports = router;
