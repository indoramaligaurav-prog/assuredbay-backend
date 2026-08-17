const express = require("express");
const router = express.Router();
const order = require("../../controllers/vendor/order-controller");
const shipment = require('../../controllers/vendor/shipment.controller');
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");

router.get("/vendor/orders", verifyToken, getVendor, order.getOrdersByVendor);
router.put(
  "/vendor/orders/:id",
  verifyToken,
  getVendor,
  order.updateOrderByVendor
);
router.get(
  "/vendor/orders/:id",
  verifyToken,
  getVendor,
  order.getOrderByVendor
);

router.patch('/vendor/orders/item/:id/decision', 
  verifyToken,
  getVendor,
  order.updateOrderItemDecision
);


module.exports = router;
