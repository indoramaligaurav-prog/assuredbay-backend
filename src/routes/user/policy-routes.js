const express = require("express");
const router = express.Router();
const Policy = require("../../controllers/user/policy-controller");

router.get("/policies/:type", Policy.getPolicyByType);

module.exports = router;
