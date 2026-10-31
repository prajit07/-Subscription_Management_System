const express = require('express');
const router  = express.Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, requireRole('admin','staff'), async (req, res) => {
  try {
    const [active, revenue, overdue, recent] = await Promise.all([
      db.query(`SELECT COUNT(*) AS count FROM subscriptions WHERE state = 'active'`),
      db.query(`SELECT COALESCE(SUM(amount),0) AS collected FROM payments WHERE status='completed' AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())`),
      db.query(`SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS amount FROM invoices WHERE due_date < NOW() AND state NOT IN ('paid','cancelled')`),
      db.query(`SELECT s.sequence_number, s.state, s.start_date, u.full_name AS customer_name, rp.name AS plan_name, rp.price FROM subscriptions s JOIN users u ON u.id=s.customer_id JOIN recurring_plans rp ON rp.id=s.plan_id ORDER BY s.created_at DESC LIMIT 5`),
    ]);
    const mrrRes = await db.query(`SELECT COALESCE(SUM(mrr),0) AS total_mrr FROM subscription_mrr_summary`).catch(() => ({ rows: [{ total_mrr: 0 }] }));
    const mrr = parseFloat(mrrRes.rows[0].total_mrr || 0);
    res.json({
      active_subscriptions: parseInt(active.rows[0].count),
      revenue_this_month: parseFloat(revenue.rows[0].collected),
      overdue_count: parseInt(overdue.rows[0].count),
      overdue_amount: parseFloat(overdue.rows[0].amount),
      mrr, arr: mrr * 12,
      recent_subscriptions: recent.rows,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Dashboard query failed' }); }
});

router.get('/ar', authenticate, requireRole('admin','staff'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT i.id, i.invoice_number, i.total, i.due_date, i.state, u.full_name AS customer_name, u.email AS customer_email,
             s.sequence_number AS subscription_number, NOW()::date - i.due_date AS days_overdue
      FROM invoices i JOIN users u ON u.id=i.customer_id JOIN subscriptions s ON s.id=i.subscription_id
      WHERE i.state NOT IN ('paid','cancelled') ORDER BY i.due_date ASC LIMIT 100`);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: 'AR query failed' }); }
});

module.exports = router;
