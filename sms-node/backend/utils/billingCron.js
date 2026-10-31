const cron = require('node-cron');
const db = require('../config/database');

function startBillingCron() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Billing cycle (stub) - implement per needs');
  }, { timezone: 'Asia/Kolkata' });
  console.log('[CRON] Billing cron scheduled');
}
async function runBillingCycle() {
  console.log('[BILLING] manual run stub');
}
module.exports = { startBillingCron, runBillingCycle };