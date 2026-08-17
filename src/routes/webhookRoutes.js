const express = require("express");
const router = express.Router();

const {
  handleStripeWebhook,
} = require("../controllers/stripeWebhookController");

const { fedexWebhook }        = require("../controllers/fedxWebhookcontrollers")

// ⚠️ IMPORTANT → raw body required
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

router.post("/fedex", fedexWebhook);

module.exports = router;