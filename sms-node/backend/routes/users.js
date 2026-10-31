const express = require('express');
const router  = express.Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let cond = [], params = [], i = 1;
    if (role) { cond.push(`role = $${i++}`); params.push(role); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const { rows } = await db.query(
      `SELECT id, email, full_name, role, is_active, created_at FROM users ${where}
       ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, parseInt(limit), offset]);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

router.patch('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { is_active, role } = req.body;
    const fields = []; const vals = []; let i = 1;
    if (is_active !== undefined) { fields.push(`is_active = $${i++}`); vals.push(is_active); }
    if (role) { fields.push(`role = $${i++}`); vals.push(role); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING id, email, full_name, role, is_active`,
      vals);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Update failed' }); }
});

module.exports = router;
EOF