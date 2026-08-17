const express = require("express");
const router = express.Router();
const payment = require("../../controllers/admin/payment-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.post(
  "/admin/payments",
  verifyToken,
  getAdmin,
  payment.createPaymentByAdmin
);
router.get(
  "/admin/payments",
  verifyToken,
  getAdmin,
  payment.getPaymentsByAdmin
);
router.get(
  "/admin/payments/:pid",
  verifyToken,
  getAdmin,
  payment.getPaymentDetailsByIdByAdmin
);
router.get(
  "/admin/shops/:slug/income",
  verifyToken,
  getAdmin,
  payment.getIncomeByShopByAdmin
);
router.put(
  "/admin/payments/:id",
  verifyToken,
  getAdmin,
  payment.updatePaymentByAdmin
);
router.put(
  "/admin/payments/:pid/status",
  verifyToken,
  getAdmin,
  payment.updatePaymentStatusByAdmin
);

router.delete(
  "/admin/payments/:id",
  verifyToken,
  getAdmin,
  payment.deletePaymentByAdmin
);
router.get("/admin/payouts", verifyToken, getAdmin, payment.getPayoutsByAdmin);

module.exports = router;
