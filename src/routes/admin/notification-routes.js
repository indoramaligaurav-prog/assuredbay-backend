const express = require("express");
const router = express.Router();
const notification = require("../../controllers/admin/notification-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.get(
  "/admin/notifications",
  verifyToken,
  getAdmin,
  notification.getNotificationsByAdmin
);
router.post(
  "/admin/notifications",
  verifyToken,
  getAdmin,
  notification.createNotificationByAdmin
);

module.exports = router;
