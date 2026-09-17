const cron = require('node-cron');
const updateCurrencyRates = require('../utils/updateCurrencyRates');
const { escalateOverdueVendorTickets } = require('../services/support.service');

module.exports = () => {
  cron.schedule('0 * * * *', async () => {
    console.log("Running currency update cron...");
    await updateCurrencyRates();
  });

  // Runs every 15 minutes — vendor SLA is 48h, so this granularity is
  // more than tight enough without hammering the DB.
  cron.schedule('*/15 * * * *', async () => {
    const count = await escalateOverdueVendorTickets();
    if (count > 0) console.log(`Escalated ${count} overdue vendor ticket(s) to admin.`);
  });
};