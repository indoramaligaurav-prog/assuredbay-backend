const express = require("express");
const router = express.Router();
const support = require("../../controllers/vendor/support-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");

router.post("/vendor/support/tickets", verifyToken, getVendor, support.createTicketByVendor);
router.get("/vendor/support/tickets/my", verifyToken, getVendor, support.getMyTicketsByVendor);

// MUST come before the /:id route below
router.get("/vendor/support/tickets/customer-issues", verifyToken, getVendor, support.getTicketsForVendor);

router.get("/vendor/support/tickets/:id", verifyToken, getVendor, support.getTicketByVendor);
router.post("/vendor/support/tickets/:id/messages", verifyToken, getVendor, support.replyToTicketByVendor);
router.patch("/vendor/support/tickets/:id/decision", verifyToken, getVendor, support.decideTicketByVendor);
router.get("/vendor/support/tickets/:id/issue-context", verifyToken, getVendor, support.getIssueContextByVendor);

module.exports = router;