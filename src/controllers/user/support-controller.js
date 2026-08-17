const supportService = require("../../services/support.service");
const { getIssueEligibility } = require("../../services/issue-eligibility.service");

// NOTE: assuming getUser-middleware attaches the logged-in user doc to req.user.

exports.createTicketByUser = async (req, res) => {
  try {
    // req.files populated by evidence-upload-middleware.js (multer) on the route.
    // Stored relative to /uploads, same convention as your product images.
    const evidenceFiles = (req.files || []).map((f) => ({
      url: `/uploads/support-evidence/${f.filename}`,
      mimeType: f.mimetype,
      originalname: f.originalname
    }));

    const ticket = await supportService.createTicket({
      requester: req.user,
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
    return res.json({ success: true, ticket, messages });
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