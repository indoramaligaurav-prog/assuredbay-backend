const axios = require('axios');
const Currency = require('../models/Currencies'); // check your exact file name
const Countries = require('../models/Countries');

const updateCurrencyRates = async () => {
  try {

    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/14f581a793a46303212dee2c/latest/USD`
    );

    const rates = response.data.conversion_rates;

     for (const code in rates) {
      let currency = await Currency.findOne({ code });

      // Create currency if it doesn't exist
      if (!currency) {
        const countryDetail = await Countries.findOne({ currency: code });

        if (!countryDetail) {
          console.log(`❌ No country found for currency ${code}`);
          continue;
        }

        console.log("Creating currency:", code);

        currency = await Currency.create({
          country: countryDetail.label,
          code: code,
          name: code, // Replace later with full currency name if you have one
          symbol: countryDetail.currency_symbol,
          rate: rates[code],
          updatedAt: new Date(),
        });

        console.log(`✅ Created ${code}`);
      } else {
        currency.rate = rates[code];
        currency.updatedAt = new Date();

        await currency.save();
      }
    }

    console.log("✅ Currency rates updated successfully");
  } catch (error) {
    console.error("❌ Error updating currency:", error.message);
  }
};

module.exports = updateCurrencyRates;