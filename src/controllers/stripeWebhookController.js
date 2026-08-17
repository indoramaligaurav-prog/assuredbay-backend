const Stripe = require("stripe");
const stripe = new Stripe("sk_test_51TGWfaQEZr0p8KWqqmYJ3IQ0FoW8vN6qHNsQz5myO4S0bk5RytSeAVPSEqRzhXbdDjrJ8CVwd3njmIrH4S7t0cD700NK3ZxU3T");

const endpointSecret = "whsec_aDRX1WLt3ZgeMFxaigN52sDFngTdFhrV";

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.log("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🔥 Handle event
  if (event.type === "identity.verification_session.verified") {
    const session = event.data.object;

    const userId = session.metadata.userId;


    // 👉 update your DB
    const User = require("../models/User");
    const Shop = require("../models/Shop");
    const generateUsername = require("../utils/usernamegenerator");

    // find user
  

      // find shop using vendor id
        const shop = await Shop.findOne({
          vendor: userId,
        });

        if (!shop) {
          return res.status(404).json({
            success: false,
            message: "Shop not found",
          });
        }

        // generate username from shop name
        const username = await generateUsername({
          shopName: shop.name,
          type: "shop",
        });

          // update user username
        await User.findByIdAndUpdate(userId, {
          username,
        })

    await Shop.findOneAndUpdate(
      { vendor: userId },
      {
        kycStatus: "approved",
        kycProcessedAt: new Date(),
      }
    );
  }

  // ❌ Failed case
  if (event.type === "identity.verification_session.requires_input") {
    const session = event.data.object;

    const userId = session.metadata.userId;

    console.log("❌ KYC FAILED:", userId);

    const Shop = require("../models/Shop");

    await Shop.findOneAndUpdate(
      { vendor: userId },
      {
        kycStatus: "rejected",
      }
    );
  }

  if (event.type === "account.updated") {
    const account = event.data.object;

    const Shop = require("../models/Shop");

    const updateFields = {
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
    };

    // Auto-approve shop once Stripe onboarding is fully complete
    if (account.payouts_enabled) {
      updateFields.status = "approved";
    }

    await Shop.findOneAndUpdate(
      { stripeAccountId: account.id },
      updateFields
    );
  }

  res.json({ received: true });
};