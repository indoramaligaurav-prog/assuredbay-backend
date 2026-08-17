const express = require("express");
const router = express.Router();
const shop = require("../../controllers/vendor/shop-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");

router.post("/vendor/shops", verifyToken, getVendor, shop.createShopByVendor);
router.get(
  "/vendor/shop/stats",
  verifyToken,
  getVendor,
  shop.getShopStatsByVendor
);
router.get("/vendor/shop", verifyToken, getVendor, shop.getOneShopByVendor);
router.put(
  "/vendor/shops/:slug",
  verifyToken,
  getVendor,
  shop.updateOneShopByVendor
);
router.delete(
  "/vendor/shops/:slug",
  verifyToken,
  getVendor,
  shop.deleteOneShopByVendor
);

router.get("/vendor/shop-status", verifyToken, shop.getShopStatus);

router.post("/vendor/phone/send-otp", verifyToken, shop.sendPhoneOtp);

router.post("/vendor/phone/verify-otp", verifyToken, shop.verifyPhoneOtp);

module.exports = router;
