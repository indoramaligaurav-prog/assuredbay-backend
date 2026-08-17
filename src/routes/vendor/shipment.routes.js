const express  = require("express");
const router   = express.Router();
const shipment = require('../../controllers/vendor/shipment.controller');
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");

router.post('/shipments/create',        verifyToken, getVendor, shipment.createShipmentHandler);
router.get('/shipments/label/:orderItemId', verifyToken, getVendor, shipment.downloadLabel);
router.post('/shipments/pickup', verifyToken, getVendor, shipment.schedulePickupHandler);

module.exports = router;