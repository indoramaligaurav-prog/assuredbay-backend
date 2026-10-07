const express = require("express");
const router = express.Router();
const tier = require("../../controllers/vendor/tier-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");

router.get("/vendor/tier",verifyToken, getVendor, tier.getMyTierByVendor);

module.exports = router;