const express = require("express");
const router = express.Router();
const Policy = require("../../controllers/admin/policy-controller");

router.post("/admin/policies", Policy.createPolicy);
router.get("/admin/policies", Policy.getAllPolicies);
router.put("/admin/policies/:type", Policy.updatePolicy);
router.delete("/admin/policies/:type", Policy.deletePolicy);

module.exports = router;
