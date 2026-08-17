const express = require("express");
const router = express.Router();
const couponCode = require("../../controllers/user/coupon-code-controller");

router.get("/coupon-codes/:code", couponCode.getCouponCodeByCode);
router.get("/admin/coupon-codes/:id", couponCode.getCouponCodeById);

module.exports = router;
