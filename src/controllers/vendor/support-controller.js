const supportService = require("../../services/support.service");
const { getIssueEligibility } = require("../../services/issue-eligibility.service");
const SupportTicket = require("../../models/SupportTicket");


// NOTE: assuming getVendor-middleware attaches the logged-in vendor doc to req.user
// (mirroring how order-controller.js's getOrdersByVendor likely reads it). If your
// getVendor-middleware attaches to req.vendor instead, update the four `req.user`
// references below to `req.vendor`.

exports.createTicketByVendor = async (req, res) => {
  try {
    const ticket = await supportService.createTicket({
      requester: req.user,
      raiserRole: "vendor",
      body: req.body,
    });
    return res.status(201).json({ success: true, ticket });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not create ticket" });
  }
};

exports.getMyTicketsByVendor = async (req, res) => {
  try {
    const tickets = await supportService.getMyTickets({ requesterId: req.user._id, status: req.query.status });
    return res.json({ success: true, tickets });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not fetch tickets" });
  }
};

exports.getTicketByVendor = async (req, res) => {
  try {
    const { ticket, messages } = await supportService.getTicketById({ id: req.params.id, requester: req.user });
    return res.json({ success: true, ticket, messages });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not fetch ticket" });
  }
};

exports.replyToTicketByVendor = async (req, res) => {
  try {
    const ticket = await supportService.replyToTicket({ id: req.params.id, requester: req.user, body: req.body });
    return res.status(201).json({ success: true, ticket });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not post reply" });
  }
};

exports.decideTicketByVendor = async (req, res) => {
  try {
    const ticket = await supportService.vendorDecide({
      id: req.params.id,
      vendor: req.user,
      decision: req.body.decision,
      note: req.body.note
    });
    return res.json({ success: true, ticket });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not record decision" });
  }
};

// Vendor-facing context banner — same eligibility/policy data the customer
// saw when picking their reason, plus the actual computed return policy,
// so the vendor can't claim they weren't told the condition tier.
exports.getIssueContextByVendor = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (!ticket.vendor || ticket.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (!ticket.relatedOrderItem) {
      return res.status(400).json({ success: false, message: "This ticket has no related order item" });
    }

    const result = await getIssueEligibility({
      orderItemId: ticket.relatedOrderItem,
      buyerId: ticket.raisedBy.user
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not load issue context" });
  }
};

exports.getTicketsForVendor = async (req, res) => {
  try {
    const tickets = await supportService.getTicketsForVendor({
      vendorId: req.user._id,
      status: req.query.status,
      currentHandler: req.query.currentHandler
    });
    return res.json({ success: true, tickets });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not fetch tickets" });
  }
};