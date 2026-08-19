const supportService = require("../../services/support.service");
const { getIssueEligibility } = require("../../services/issue-eligibility.service");
const SupportTicket = require("../../models/SupportTicket");
// NOTE: assuming getAdmin-middleware attaches the logged-in admin doc to req.admin.

exports.getAllTicketsByAdmin = async (req, res) => {
  try {
    const result = await supportService.getAllTickets(req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not fetch tickets" });
  }
};

exports.getTicketByAdmin = async (req, res) => {
  try {
    const { ticket, messages } = await supportService.getTicketById({ id: req.params.id, requester: req.admin });
    return res.json({ success: true, ticket, messages });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not fetch ticket" });
  }
};

exports.replyToTicketByAdmin = async (req, res) => {
  try {
    const ticket = await supportService.replyToTicket({ id: req.params.id, requester: req.admin, body: req.body });
    return res.status(201).json({ success: true, ticket });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not post reply" });
  }
};

exports.updateTicketStatusByAdmin = async (req, res) => {
  try {
    const ticket = await supportService.updateStatus({ id: req.params.id, status: req.body.status });
    return res.json({ success: true, ticket });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not update status" });
  }
};

exports.assignTicketByAdmin = async (req, res) => {
  try {
    const ticket = await supportService.assignTicket({ id: req.params.id, adminId: req.body.adminId });
    return res.json({ success: true, ticket });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not assign ticket" });
  }
};

/**
 * PATCH /admin/support/tickets/:id/decision
 * Phase 1 — Approve Return+Refund / Approve Refund only / Approve
 * Replacement / Approve Repair / Decline. Records the decision only —
 * no automatic refund is triggered.
 */
exports.decideTicketByAdmin = async (req, res) => {
  try {
    const ticket = await supportService.decideTicket({
      id: req.params.id,
      admin: req.admin,
      decision: req.body.decision,
      note: req.body.note
    });
    return res.json({ success: true, ticket });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not record decision" });
  }
};

exports.getIssueEligibilityByAdmin = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (!ticket.relatedOrderItem) {
      return res.status(400).json({ success: false, message: "This ticket has no related order item" });
    }
 
    const result = await getIssueEligibility({
      orderItemId: ticket.relatedOrderItem,
      buyerId: ticket.raisedBy.user
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not load policy context" });
  }
};