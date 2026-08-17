const express = require("express");
const router = express.Router();
const currency = require("../../controllers/admin/currency-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.get(
  "/admin/currencies",
  verifyToken,
  getAdmin,
  currency.getAdminCurrencies
);
router.get(
  "/admin/currencies/:cid",
  verifyToken,
  getAdmin,
  currency.getCurrency
);

router.post(
  "/admin/currencies",
  verifyToken,
  getAdmin,
  currency.createCurrency
);

router.put(
  "/admin/currencies/:cid",
  verifyToken,
  getAdmin,
  currency.updateCurrency
);

router.delete(
  "/admin/currencies/:cid",
  getAdmin,
  verifyToken,
  currency.deleteCurrency
);

module.exports = router;
