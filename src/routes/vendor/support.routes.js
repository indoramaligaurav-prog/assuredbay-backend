const express = require("express");
const router = express.Router();
const support = require("../../controllers/vendor/support-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");


router.post("/vendor/support/tickets", verifyToken, getVendor, support.createTicketByVendor);
router.get("/vendor/support/tickets/my", verifyToken, getVendor, support.getMyTicketsByVendor);
router.get("/vendor/support/tickets/:id", verifyToken, getVendor, support.getTicketByVendor);
router.post("/vendor/support/tickets/:id/messages", verifyToken, getVendor, support.replyToTicketByVendor);

module.exports = router;