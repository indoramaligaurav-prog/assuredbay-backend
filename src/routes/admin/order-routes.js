const express = require("express");
const router = express.Router();
const order = require("../../controllers/admin/order-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");
router.get("/admin/orders", verifyToken, getAdmin, order.getOrdersByAdmin);
router.get(
  "/admin/orders/:id",
  verifyToken,
  getAdmin,
  order.getOneOrderByAdmin
);
router.put(
  "/admin/orders/:id",
  verifyToken,
  getAdmin,
  order.updateOrderByAdmin
);
router.delete(
  "/admin/orders/:id",
  verifyToken,
  getAdmin,
  order.deleteOrderByAdmin
);

module.exports = router;
