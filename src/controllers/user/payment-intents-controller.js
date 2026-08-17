const Stripe = require("stripe");
const Settings = require("../../models/Settings");

/*    Create a Payment Intent  */
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency } = req.body;

    const settings = await Settings.findOne({});
    if (!settings || !settings.general || !settings.general.stripe) {
      return res
        .status(400)
        .json({ success: false, message: "Stripe settings not found" });
    }

    const stripeSecretKey = settings.general.stripe.secretKey;
    const stripe = new Stripe(stripeSecretKey);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: currency.toLowerCase(),
    });

    return res.status(201).json({ client_secret: paymentIntent.client_secret });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPaymentIntent,
};
