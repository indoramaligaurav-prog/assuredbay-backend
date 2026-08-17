const express = require("express");
const router = express.Router();
const paymentIntents = require("../../controllers/user/payment-intents-controller");

router.post("/payment-intents", paymentIntents.createPaymentIntent);

module.exports = router;
