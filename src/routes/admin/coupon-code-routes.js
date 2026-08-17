const express = require("express");
const router = express.Router();
const couponCode = require("../../controllers/admin/coupon-code-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.get(
  "/admin/coupon-codes",
  verifyToken,
  getAdmin,
  couponCode.getCouponCodesByAdmin
);
router.post(
  "/admin/coupon-codes",
  verifyToken,
  getAdmin,
  couponCode.createCouponCodeByAdmin
);
router.get(
  "/admin/coupon-codes/:id",
  verifyToken,
  getAdmin,
  couponCode.getOneCouponCodeByAdmin
);
router.put(
  "/admin/coupon-codes/:id",
  verifyToken,
  getAdmin,
  couponCode.updatedCouponCodeByAdmin
);
router.delete(
  "/admin/coupon-codes/:id",
  verifyToken,
  getAdmin,
  couponCode.deleteCouponCodeByAdmin
);

module.exports = router;
