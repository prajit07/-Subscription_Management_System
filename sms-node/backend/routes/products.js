const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT p.*, json_agg(json_build_object('id', pv.id, 'attribute', pv.attribute, 'value', pv.value, 'price_addon', pv.price_addon)) FILTER (WHERE pv.id IS NOT NULL) AS variants FROM products p LEFT JOIN product_variants pv ON pv.product_id = p.id WHERE p.is_active = TRUE GROUP BY p.id ORDER BY p.name`);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', authenticate, requireRole('admin'), [
  body('name').trim().notEmpty(),
  body('type').isIn(['subscription','one_time','addon']),
  body('base_price').isNumeric(),
  handleValidationErrors,
], async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { name, description, type, base_price, cost_price, variants } = req.body;
    const { rows } = await client.query(`INSERT INTO products (name, description, type, base_price, cost_price, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [name, description || null, type, base_price, cost_price || null, req.user.id]);
    const productId = rows[0].id;
    if (variants && variants.length) {
      for (const v of variants) {
        await client.query('INSERT INTO product_variants (product_id, attribute, value, price_addon) VALUES ($1,$2,$3,$4)', [productId, v.attribute, v.value, v.price_addon || 0]);
      }
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Product creation failed' }); }
  finally { client.release(); }
});

router.get('/plans', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM recurring_plans WHERE is_active = TRUE ORDER BY price');
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/plans', authenticate, requireRole('admin'), [
  body('name').trim().notEmpty(),
  body('frequency').isIn(['daily','weekly','monthly','yearly']),
  body('price').isNumeric(),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { name, frequency, price, min_quantity, auto_close, closable, upsell_enabled, grace_period_days } = req.body;
    const { rows } = await db.query(
      `INSERT INTO recurring_plans (name, frequency, price, min_quantity, auto_close, closable, upsell_enabled, grace_period_days, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, frequency, price, min_quantity || 1, auto_close || false, closable !== false, upsell_enabled || false, grace_period_days || 15, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Plan creation failed' }); }
});

router.get('/discounts', authenticate, requireRole('admin','staff'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM discount_rules WHERE is_active = TRUE ORDER BY created_at DESC');
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/discounts', authenticate, requireRole('admin'), [
  body('name').trim().notEmpty(),
  body('type').isIn(['fixed','percentage']),
  body('scope').isIn(['product','subscription']),
  body('value').isNumeric(),
  body('start_date').isISO8601(),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { name, type, scope, product_id, value, min_quantity, min_purchase, start_date, end_date, max_uses } = req.body;
    const { rows } = await db.query(
      `INSERT INTO discount_rules (name, type, scope, product_id, value, min_quantity, min_purchase, start_date, end_date, max_uses, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, type, scope, product_id || null, value, min_quantity || null, min_purchase || null, start_date, end_date || null, max_uses || null, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Discount creation failed' }); }
});

module.exports = router;
