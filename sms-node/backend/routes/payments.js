const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

router.post('/', authenticate, requireRole('admin','staff'), [
  body('invoice_id').isUUID(),
  body('method').isIn(['credit_card','bank_transfer','upi','wallet','cash']),
  body('amount').isNumeric().custom(v => parseFloat(v) > 0),
  handleValidationErrors,
], async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { invoice_id, method, amount, reference_note } = req.body;
    const { rows: invRows } = await client.query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);
    if (!invRows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Invoice not found' }); }
    const inv = invRows[0];
    if (['paid','cancelled'].includes(inv.state)) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Invoice is ${inv.state}` }); }
    const { rows: pay } = await client.query(
      `INSERT INTO payments (invoice_id, customer_id, method, status, amount, reference_note, paid_at) VALUES ($1,$2,$3,'completed',$4,$5,NOW()) RETURNING *`,
      [invoice_id, inv.customer_id, method, amount, reference_note || null]);
    const { rows: totals } = await client.query(`SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE invoice_id=$1 AND status='completed'`, [invoice_id]);
    const totalPaid = parseFloat(totals[0].paid);
    const newState = totalPaid >= parseFloat(inv.total) ? 'paid' : 'confirmed';
    await client.query('UPDATE invoices SET state=$1, updated_at=NOW() WHERE id=$2', [newState, invoice_id]);
    await client.query('COMMIT');
    res.status(201).json({ payment: pay[0], invoice_state: newState });
  } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ error: 'Payment failed' }); }
  finally { client.release(); }
});

router.get('/', authenticate, requireRole('admin','staff'), async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT p.*, i.invoice_number, u.full_name AS customer_name FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN users u ON u.id=p.customer_id ORDER BY p.paid_at DESC NULLS LAST LIMIT 50`);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
