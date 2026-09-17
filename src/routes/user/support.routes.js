const express = require("express");
const router = express.Router();
const support = require("../../controllers/user/support-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getUser } = require("../../middlewares/getUser-middleware");
const evidenceUpload = require("../../middlewares/evidence-upload-middleware");

// evidenceUpload.array('evidence', 6) is a no-op for plain JSON requests
// (general queries, or order-issue reasons that don't require evidence) —
// it only kicks in when the request is actually multipart/form-data.
router.post(
  "/support/tickets",
  verifyToken,
  getUser,
  evidenceUpload.array("evidence", 6),
  support.createTicketByUser
);
router.get("/support/tickets/my", verifyToken, getUser, support.getMyTicketsByUser);
router.get("/support/tickets/:id", verifyToken, getUser, support.getTicketByUser);
router.post("/support/tickets/:id/messages", verifyToken, getUser, support.replyToTicketByUser);

router.get(
  "/support/order-items/:orderItemId/eligibility",
  verifyToken,
  getUser,
  support.getIssueEligibilityByUser
);

router.patch("/support/tickets/:id/respond", verifyToken, getUser, support.respondToVendorDecisionByUser);

module.exports = router;