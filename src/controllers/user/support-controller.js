const supportService = require("../../services/support.service");
const { getIssueEligibility } = require("../../services/issue-eligibility.service");
const { attachTicketContext } = require("../../utils/ticket-context");

const SupportTicket = require("../../models/SupportTicket");

// NOTE: assuming getUser-middleware attaches the logged-in user doc to req.user.

exports.createTicketByUser = async (req, res) => {
  try {

      const itemId = req.body.relatedOrderItem;
      if (itemId) {
        const existing = await SupportTicket.findOne({
          "raisedBy.user": req.userData?._id || req.user?._id,
          relatedOrderItem: itemId,
          status: { $nin: ["resolved", "closed"] }
        }).select("_id ticketNo");

        if (existing) {
          return res.status(409).json({
            success: false,
            message: `You already have an open ticket (${existing.ticketNo}) for this item`,
            ticketId: existing._id
          });
        }
      }

    // req.files populated by evidence-upload-middleware.js (multer) on the route.
    // Stored relative to /uploads, same convention as your product images.
    const evidenceFiles = (req.files || []).map((f) => ({
      url: `/uploads/support-evidence/${f.filename}`,
      mimeType: f.mimetype,
      originalname: f.originalname
    }));
    


    const ticket = await supportService.createTicket({
      requester: req.userData,
      raiserRole: "user",
      body: req.body,
      evidenceFiles
    });
    return res.status(201).json({ success: true, ticket });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not create ticket" });
  }
};

exports.getMyTicketsByUser = async (req, res) => {
  try {
    const tickets = await supportService.getMyTickets({ requesterId: req.user._id, status: req.query.status });
    return res.json({ success: true, tickets });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not fetch tickets" });
  }
};

exports.getTicketByUser = async (req, res) => {
  try {
    const { ticket, messages } = await supportService.getTicketById({ id: req.params.id, requester: req.user });
    return res.json({ success: true, ticket: await attachTicketContext(ticket), messages });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not fetch ticket" });
  }
};

exports.replyToTicketByUser = async (req, res) => {
  try {
    const ticket = await supportService.replyToTicket({ id: req.params.id, requester: req.user, body: req.body });
    return res.status(201).json({ success: true, ticket });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not post reply" });
  }
};

exports.getIssueEligibilityByUser = async (req, res) => {
  try {
    const result = await getIssueEligibility({ orderItemId: req.params.orderItemId, buyerId: req.user._id });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not load issue options" });
  }
};

exports.respondToVendorDecisionByUser = async (req, res) => {
  try {
    const ticket = await supportService.customerRespond({
      id: req.params.id,
      customer: req.userData,
      accepted: req.body.accepted,
      note: req.body.note
    });
    return res.json({ success: true, ticket });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not submit your response" });
  }
};

exports.getOpenTicketForItemByUser = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      "raisedBy.user": req.user._id,
      relatedOrderItem: req.params.orderItemId,
      status: { $nin: ["resolved", "closed"] }
    })
      .sort({ createdAt: -1 })
      .select("_id ticketNo status");

    return res.json({ success: true, ticket: ticket || null });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not check tickets" });
  }
};