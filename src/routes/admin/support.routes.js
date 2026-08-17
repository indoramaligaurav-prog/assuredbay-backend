const express = require("express");
const router = express.Router();
const support = require("../../controllers/admin/support-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");
const checkPermission = require("../../middlewares/checkPermission");

router.get(
  "/admin/support/tickets",
  verifyToken,
  getAdmin,
  checkPermission("support.view"),
  support.getAllTicketsByAdmin
);
router.get(
  "/admin/support/tickets/:id",
  verifyToken,
  getAdmin,
  checkPermission("support.view"),
  support.getTicketByAdmin
);
router.post(
  "/admin/support/tickets/:id/messages",
  verifyToken,
  getAdmin,
  checkPermission("support.manage"),
  support.replyToTicketByAdmin
);
router.patch(
  "/admin/support/tickets/:id/status",
  verifyToken,
  getAdmin,
  checkPermission("support.manage"),
  support.updateTicketStatusByAdmin
);
router.patch(
  "/admin/support/tickets/:id/assign",
  verifyToken,
  getAdmin,
  checkPermission("support.manage"),
  support.assignTicketByAdmin
);

// Phase 1 — Approve Return+Refund / Refund only / Replacement / Repair / Decline
router.patch(
  "/admin/support/tickets/:id/decision",
  verifyToken,
  getAdmin,
  checkPermission("support.manage"),
  support.decideTicketByAdmin
);

router.get(
  "/admin/support/tickets/:id/eligibility",
  verifyToken,
  getAdmin,
  checkPermission("support.view"),
  support.getIssueEligibilityByAdmin
);
 

module.exports = router;