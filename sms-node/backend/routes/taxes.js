const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM tax_rules WHERE is_active = TRUE ORDER BY name');
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch taxes' }); }
});

router.post('/', authenticate, requireRole('admin'), [
  body('name').trim().notEmpty(),
  body('rate').isNumeric().custom(v => parseFloat(v) >= 0 && parseFloat(v) <= 100),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { name, rate } = req.body;
    const { rows } = await db.query('INSERT INTO tax_rules (name, rate) VALUES ($1,$2) RETURNING *', [name, rate]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Tax creation failed' }); }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.query('UPDATE tax_rules SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Tax deactivated' });
  } catch (err) { res.status(500).json({ error: 'Delete failed' }); }
});

module.exports = router;
EOF