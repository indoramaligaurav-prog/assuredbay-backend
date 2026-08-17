const express = require("express");
const router = express.Router();
const admin = require("../../controllers/admin/admin-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.get("/admin/users", verifyToken, getAdmin, admin.getUsersByAdmin);
router.get(
  "/admin/users/:id",
  verifyToken,
  getAdmin,
  admin.getUserOrdersByAdmin
);
router.post(
  "/admin/users/role/:id",
  verifyToken,
  getAdmin,
  admin.updateUserRoleByAdmin
);


router.get("/admin/permissions", verifyToken, getAdmin, admin.getAllPermissions);
router.get("/admin/roles", verifyToken, getAdmin, admin.getAdminRoles);
router.get("/admin/roles/:id", verifyToken, getAdmin, admin.getOneAdminRole);
router.post("/admin/roles", verifyToken, getAdmin, admin.createAdminRole);
router.put("/admin/roles/:id", verifyToken, getAdmin, admin.updateAdminRole);
router.delete("/admin/roles/:id", verifyToken, getAdmin, admin.deleteAdminRole);
router.put("/admin/users/:id/role", verifyToken, getAdmin, admin.assignRoleToUser);

module.exports = router;
