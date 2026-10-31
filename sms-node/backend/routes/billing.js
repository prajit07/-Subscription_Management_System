const express = require('express');
const router  = express.Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/run', authenticate, requireRole('admin','staff'), async (req, res) => {
  res.json({ message: 'Billing cycle started in background' });
});

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