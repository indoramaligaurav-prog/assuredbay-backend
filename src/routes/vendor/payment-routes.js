const express = require("express");
const router = express.Router();
const payment = require("../../controllers/vendor/payment-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");

router.get(
  "/vendor/shops/income",
  verifyToken,
  getVendor,
  payment.getIncomeByVendor
);
router.get(
  "/vendor/payments",
  verifyToken,
  getVendor,
  payment.getPaymentsByVendor
);
router.get(
  "/vendor/payments/:pid",
  verifyToken,
  getVendor,
  payment.getPaymentDetailsByIdByVendor
);

module.exports = router;
