const Stripe = require("stripe");
const stripe = new Stripe("sk_test_51TGWfaQEZr0p8KWqqmYJ3IQ0FoW8vN6qHNsQz5myO4S0bk5RytSeAVPSEqRzhXbdDjrJ8CVwd3njmIrH4S7t0cD700NK3ZxU3T");

// 🔥 Create a Stripe Connected Account (Express) for a vendor
const createConnectedAccount = async (vendor, shop, countryCode) => {
  try {
    const account = await stripe.accounts.create({
      type: "express",
      email: vendor.email,
      country: countryCode,
      metadata: {
        userId: vendor._id.toString(),
        shopId: shop._id.toString(),
      },
      capabilities: {
        transfers: { requested: true },
      },
    });

    return account;
  } catch (err) {
    console.log("Stripe Connect Account Error:", err.message);
    throw new Error("Failed to create Stripe connected account");
  }
};

// 🔥 Generate the onboarding link vendor is redirected to
const createOnboardingLink = async (accountId) => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: "https://assuredbay.com/vendor/onboarding/refresh",
      return_url: "https://assuredbay.com/kyc-result",
      type: "account_onboarding",
    });

    return accountLink;
  } catch (err) {
    console.log("Stripe Account Link Error:", err.message);
    throw new Error("Failed to create onboarding link");
  }
};

module.exports = { createConnectedAccount, createOnboardingLink };