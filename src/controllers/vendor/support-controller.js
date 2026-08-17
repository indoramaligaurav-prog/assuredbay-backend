const supportService = require("../../services/support.service");

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