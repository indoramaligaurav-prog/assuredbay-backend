const express = require("express");
const router = express.Router();
const courier = require("../../controllers/vendor/courier-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");

router.post(
  "/vendor/courier-info",
  verifyToken,
  getVendor,
  courier.createCourierInfoByVendor
);
router.put(
  "/vendor/courier-info/:id",
  verifyToken,
  getVendor,
  courier.updateCourierInfoByVendor
);

module.exports = router;
