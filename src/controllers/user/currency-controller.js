const Currency = require("../../models/Currencies");

/*  Get Currencies for User */
const getUserCurrencies = async (req, res) => {
  try {
    const currencies = await Currency.aggregate([
      {
        $match: {
          status: "active",
        },
      },
      {
        $project: {
          name: 1,
          code: 1,
          rate: 1,
          country: 1,
          base: 1,
        },
      },
      {
        $sort: { base: -1 }, // true (1) will come before false (0)
      },
    ]);

    const data = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD"
    ).then((res) => res.json());
    const mapped = currencies.map((v) => {
      return { ...v, rate: v.rate || data.rates[v.code] };
    });
    res.status(200).json({
      success: true,
      data: mapped,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
module.exports = {
  getUserCurrencies,
};
