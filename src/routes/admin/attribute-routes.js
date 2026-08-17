const express = require("express");
const router = express.Router();
const Attribute = require("../../controllers/admin/attribute-controller");

const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.post(
  "/admin/attributes",
  verifyToken,
  getAdmin,
  Attribute.createAttributeByAdmin
);

router.get(
  "/admin/attributes",
  verifyToken,
  getAdmin,
  Attribute.getAttributesByAdmin
);

router.get(
  "/admin/attributes/:id",
  verifyToken,
  getAdmin,
  Attribute.getAttributeByIdByAdmin
);

router.put(
  "/admin/attributes/:id",
  verifyToken,
  getAdmin,
  Attribute.updateAttributeByIdByAdmin
);

router.delete(
  "/admin/attributes/:id",
  verifyToken,
  getAdmin,
  Attribute.deleteAttributeByIdByAdmin
);

router.get("/admin/all-attributes", Attribute.getAllAttributesByAdmin);

module.exports = router;
