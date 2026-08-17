const cron = require('node-cron');
const updateCurrencyRates = require('../utils/updateCurrencyRates');


module.exports = () => {
   cron.schedule('0 * * * *', async () => {
    console.log("Running currency update cron...");
    await updateCurrencyRates();
  });
};