// models/CountryCurrency.js
const mongoose = require('mongoose');

const CountryCurrencySchema = new mongoose.Schema({
  countryCode: { type: String, required: true },
  currency: { type: String, required: true }
}, { collection: 'country_currencies' }); // <--- MUST match your MongoDB collection name exactly

module.exports = mongoose.model('CountryCurrency', CountryCurrencySchema);
