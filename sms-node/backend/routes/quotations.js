const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

// GET /api/quotations  — list templates
router.get('/', authenticate, requireRole('admin','staff'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT qt.*, u.full_name AS created_by_name,
             json_agg(json_build_object('id', qtl.id, 'product_id', qtl.product_id,
               'product_name', p.name, 'quantity', qtl.quantity, 'unit_price', qtl.unit_price,
               'sort_order', qtl.sort_order)) FILTER (WHERE qtl.id IS NOT NULL) AS lines
      FROM quotation_templates qt
      LEFT JOIN users u ON u.id = qt.created_by
      LEFT JOIN quotation_template_lines qtl ON qtl.template_id = qt.id
      LEFT JOIN products p ON p.id = qtl.product_id
      WHERE qt.is_active = TRUE
      GROUP BY qt.id, u.full_name
      ORDER BY qt.name`);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch templates' }); }
});

// POST /api/quotations  — admin creates template
router.post('/', authenticate, requireRole('admin'), [
  body('name').trim().notEmpty(),
  body('validity_days').optional().isInt({ min: 1 }),
  body('lines').isArray({ min: 1 }),
  body('lines.*.product_id').isUUID(),
  body('lines.*.quantity').isNumeric(),
  body('lines.*.unit_price').isNumeric(),
  handleValidationErrors,
], async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { name, plan_id, validity_days, notes, lines } = req.body;
    const { rows } = await client.query(`
      INSERT INTO quotation_templates (name, plan_id, validity_days, notes, created_by)
      VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, plan_id || null, validity_days || 30, notes || null, req.user.id]);
    const tid = rows[0].id;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await client.query(`
        INSERT INTO quotation_template_lines (template_id, product_id, quantity, unit_price, sort_order)
        VALUES ($1,$2,$3,$4,$5)`, [tid, l.product_id, l.quantity, l.unit_price, i]);
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Template creation failed' });
  } finally { client.release(); }
});

// DELETE /api/quotations/:id  — soft delete
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.query('UPDATE quotation_templates SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Template deactivated' });
  } catch (err) { res.status(500).json({ error: 'Delete failed' }); }
});

// POST /api/quotations/:id/apply  — create subscription from template
router.post('/:id/apply', authenticate, requireRole('admin','staff'), [
  body('customer_id').isUUID(),
  body('start_date').isISO8601(),
  handleValidationErrors,
], async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows: tplRows } = await client.query(
      'SELECT * FROM quotation_templates WHERE id = $1 AND is_active = TRUE', [req.params.id]);
    if (!tplRows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Template not found' }); }
    const tpl = tplRows[0];

    const { rows: tLines } = await client.query(
      'SELECT * FROM quotation_template_lines WHERE template_id = $1 ORDER BY sort_order', [tpl.id]);

    // Delegate to subscriptions creation by returning assembled payload
    const lines = tLines.map(l => ({
      product_id: l.product_id, quantity: parseFloat(l.quantity), unit_price: parseFloat(l.unit_price),
    }));

    const validity = tpl.validity_days || 30;
    const expiry = new Date(req.body.start_date);
    expiry.setDate(expiry.getDate() + validity);

    await client.query('COMMIT');
    res.json({
      template: tpl,
      suggested_payload: {
        customer_id: req.body.customer_id,
        plan_id: tpl.plan_id,
        start_date: req.body.start_date,
        expiry_date: expiry.toISOString().slice(0, 10),
        lines,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Apply failed' });
  } finally { client.release(); }
});

module.exports = router;
EOF
Output

exit code 0
bash

cat > "C:\Users\praji\OneDrive\Desktop\SIH\Odoo\sms-missing\backend\routes\taxes.js" << 'EOF'
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
    const { rows } = await db.query(
      'INSERT INTO tax_rules (name, rate) VALUES ($1,$2) RETURNING *', [name, rate]);
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
Output

exit code 0
bash

cat > "C:\Users\praji\OneDrive\Desktop\SIH\Odoo\sms-missing\backend\routes\users.js" << 'EOF'
const express = require('express');
const router  = express.Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/users  — admin lists all users
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

// PATCH /api/users/:id  — admin activates/deactivates or changes role
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
Output

exit code 0
bash

cat > "C:\Users\praji\OneDrive\Desktop\SIH\Odoo\sms-missing\backend\routes\billing.js" << 'EOF'
const express = require('express');
const router  = express.Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { runBillingCycle } = require('../utils/billingCron');

// POST /api/billing/run  — manual trigger (admin/staff)
router.post('/run', authenticate, requireRole('admin','staff'), async (req, res) => {
  try {
    // Run asynchronously so the request returns immediately
    runBillingCycle().catch(e => console.error('[BILLING] manual run error:', e));
    res.json({ message: 'Billing cycle started in background' });
  } catch (err) { res.status(500).json({ error: 'Failed to start billing' }); }
});

// GET /api/billing/status
router.get('/status', authenticate, requireRole('admin','staff'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT COUNT(*) FILTER (WHERE state='active') AS active_subs,
             (SELECT COUNT(*) FROM invoices WHERE state='confirmed' AND due_date < NOW()) AS overdue_invoices,
             (SELECT COALESCE(SUM(total),0) FROM invoices WHERE state IN ('confirmed','sent')) AS outstanding_amount
      FROM subscriptions`);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Status query failed' }); }
});

module.exports = router;
EOF
Output

exit code 0
bash

cat > "C:\Users\praji\OneDrive\Desktop\SIH\Odoo\sms-missing\database\migrate.js" << 'EOF'
const fs   = require('fs');
const path = require('path');
const db   = require('../backend/config/database');

async function migrate() {
  const sqlFile = path.join(__dirname, 'migrations', '001_initial_schema.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('[MIGRATE] Running 001_initial_schema.sql …');
  await db.query(sql);
  console.log('[MIGRATE] Schema applied successfully');
  process.exit(0);
}

migrate().catch(e => { console.error('[MIGRATE] FAILED:', e.message); process.exit(1); });
EOF
Output

exit code 0
bash

cat > "C:\Users\praji\OneDrive\Desktop\SIH\Odoo\sms-missing\database\seed.js" << 'EOF'
const fs   = require('fs');
const path = require('path');
const db   = require('../backend/config/database');

async function seed() {
  const sqlFile = path.join(__dirname, 'seeds', '001_seed_data.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('[SEED] Seeding database …');
  await db.query(sql);
  console.log('[SEED] Done');
  process.exit(0);
}

seed().catch(e => { console.error('[SEED] FAILED:', e.message); process.exit(1); });
EOF
Output

exit code 0
Now wire the new backend routes into server.js. I'll provide a patched server.js snippet. Let me update the sms-missing to include a full server.js (with the new routes registered) so they can replace.<|end|><|start|>Assistant to=browser<|channel|>analysis <|constrain|>xml<|message|><rfl:parameter name="path">
C:\Users\praji\OneDrive\Desktop\SIH\Odoo\sms-missing\backend\server.js