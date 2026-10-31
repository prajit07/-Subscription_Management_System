const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');
const { startBillingCron } = require('./utils/billingCron');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/invoices',      require('./routes/invoices'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/quotations',     require('./routes/quotations'));
app.use('/api/taxes',          require('./routes/taxes'));
app.use('/api/users',          require('./routes/users'));
app.use('/api/billing',        require('./routes/billing'));
app.use('/api/dashboard',     require('./routes/dashboard'));

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(err.status || 500).json({ error: err.message || 'Internal server error' }); });

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[SMS] Server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'test') startBillingCron();
});
module.exports = app;
