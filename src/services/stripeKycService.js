const Stripe = require("stripe");

const stripe = new Stripe("sk_test_51TGWfaQEZr0p8KWqqmYJ3IQ0FoW8vN6qHNsQz5myO4S0bk5RytSeAVPSEqRzhXbdDjrJ8CVwd3njmIrH4S7t0cD700NK3ZxU3T");



// 🔥 Create verification session
const createVerificationSession = async (userId) => {
  try {
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        userId: userId.toString(),
      },
        return_url: "https://www.wreeo.com/kyc-result",
    });

    return session;

  } catch (err) {
    console.log("Stripe Error:", err.message);
    throw new Error("Stripe session failed");
  }
};

module.exports = { createVerificationSession };