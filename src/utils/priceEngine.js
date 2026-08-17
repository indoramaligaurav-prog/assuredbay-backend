const Currency = require('../models/Currencies');
const UserZone = require('../models/UserZone');
const CountryCurrency = require('../models/CountryCurrency');

async function getDisplayPrice({ product, buyerId, lockedRate = null }) {

  const sellerZone = await UserZone.findOne({ user_id: product.vendor });

  // ─── GUEST HANDLING ──────────────────────────────
  let buyerCountry;
  let buyerCurrencyCode = 'USD'; // DEFAULT for guests

  if (buyerId) {
    const buyerZone = await UserZone.findOne({ user_id: buyerId });

    if (buyerZone?.country) {
      buyerCountry = buyerZone.country;

      const buyerCurrency = await CountryCurrency.findOne({
        countryCode: buyerCountry
      });

      if (buyerCurrency?.currency) {
        buyerCurrencyCode = buyerCurrency.currency;
      }
    }
  }

  // ─── SELLER CURRENCY ─────────────────────────────
  const sellerCurrency = await CountryCurrency.findOne({
    countryCode: sellerZone.country
  });

  if (!sellerCurrency) {
    return { amount: product.price, currency: 'USD' };
  }

  let rates = lockedRate?.rates;

  if (!rates) {
    const currencies = await Currency.find({ status: 'active' });
    rates = {};
    currencies.forEach(c => rates[c.code] = c.rate);
  }

  const from = sellerCurrency.currency;
  const to   = buyerCurrencyCode;
  const amount = product.price;

  // ─── NO CONVERSION NEEDED ────────────────────────
  if (from === to) {
    return { amount, currency: to };
  }

  // ─── USD BRIDGE CONVERSION ───────────────────────
  const inUSD = from === 'USD' ? amount : amount / rates[from];
  const converted =
    to === 'USD' ? inUSD : inUSD * rates[to];

  return {
    amount: Number(converted.toFixed(2)),
    currency: to
  };
}



module.exports = { getDisplayPrice };
