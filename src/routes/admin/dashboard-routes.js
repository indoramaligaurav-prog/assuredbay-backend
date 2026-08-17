const express = require("express");
const router = express.Router();
const dashboard = require("../../controllers/admin/dashboard-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.get(
  "/admin/dashboard-analytics",
  verifyToken,
  getAdmin,
  dashboard.getDashboardAnalyticsByAdmin
);
router.get(
  "/admin/low-stock-products",
  verifyToken,
  getAdmin,
  dashboard.getAdminLowStockProductsByAdmin
);
router.get(
  "/admin/notifications",
  verifyToken,
  getAdmin,
  dashboard.getNotificationsByAdmin
);

module.exports = router;
