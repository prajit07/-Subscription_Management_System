const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

router.get('/', authenticate, requireRole('admin','staff'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT qt.*, u.full_name AS created_by_name
      FROM quotation_templates qt
      LEFT JOIN users u ON u.id = qt.created_by
      WHERE qt.is_active = TRUE
      ORDER BY qt.name`);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch templates' }); }
});

router.post('/', authenticate, requireRole('admin'), [
  body('name').trim().notEmpty(),
  body('validity_days').optional().isInt({ min: 1 }),
  body('lines').isArray({ min: 1 }),
  handleValidationErrors,
], async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { name, plan_id, validity_days, notes, lines } = req.body;
    const { rows } = await client.query(
      `INSERT INTO quotation_templates (name, plan_id, validity_days, notes, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, plan_id || null, validity_days || 30, notes || null, req.user.id]);
    const tid = rows[0].id;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await client.query(`INSERT INTO quotation_template_lines (template_id, product_id, quantity, unit_price, sort_order) VALUES ($1,$2,$3,$4,$5)`,
        [tid, l.product_id, l.quantity, l.unit_price, i]);
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Template creation failed' });
  } finally { client.release(); }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.query('UPDATE quotation_templates SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Template deactivated' });
  } catch (err) { res.status(500).json({ error: 'Delete failed' }); }
});

router.post('/:id/apply', authenticate, requireRole('admin','staff'), async (req, res) => {
  try {
    const { rows: tplRows } = await db.query('SELECT * FROM quotation_templates WHERE id = $1 AND is_active = TRUE', [req.params.id]);
    if (!tplRows.length) return res.status(404).json({ error: 'Template not found' });
    const tpl = tplRows[0];
    const { rows: tLines } = await db.query('SELECT * FROM quotation_template_lines WHERE template_id = $1 ORDER BY sort_order', [tpl.id]);
    const lines = tLines.map(l => ({ product_id: l.product_id, quantity: parseFloat(l.quantity), unit_price: parseFloat(l.unit_price) }));
    const expiry = new Date(req.body.start_date);
    expiry.setDate(expiry.getDate() + (tpl.validity_days || 30));
    res.json({ template: tpl, suggested_payload: { customer_id: req.body.customer_id, plan_id: tpl.plan_id, start_date: req.body.start_date, expiry_date: expiry.toISOString().slice(0,10), lines } });
  } catch (err) { res.status(500).json({ error: 'Apply failed' }); }
});

module.exports = router;