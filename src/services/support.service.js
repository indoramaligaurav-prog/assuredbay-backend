const SupportTicket = require("../models/SupportTicket");
const SupportMessage = require("../models/SupportMessage");
const { ISSUE_TAXONOMY_MAP } = require("../constants/issue-taxonomy");

const isStaff = (role) => role === "admin" || role === "super-admin";

async function generateUniqueTicketNo() {
  let ticketNo = SupportTicket.generateTicketNo();
  while (await SupportTicket.exists({ ticketNo })) {
    ticketNo = SupportTicket.generateTicketNo();
  }
  return ticketNo;
}

/**
 * `evidenceFiles` is pre-processed by the controller from `req.files`
 * (multer) into [{ url, mimeType }] — kept out of this service so the
 * service itself stays storage-agnostic.
 */
async function createTicket({ requester, raiserRole, body, evidenceFiles = [] }) {
  const {
    subject,
    category,
    message,
    priority,
    relatedOrder,
    relatedOrderItem,
    relatedProduct,
    relatedShop,
    issueReason,
    subReason
  } = body;

  if (!subject || !category || !message) {
    const err = new Error("subject, category and message are required");
    err.status = 400;
    throw err;
  }

  if (category === "order_issue" && relatedOrderItem) {
    if (!issueReason || !ISSUE_TAXONOMY_MAP[issueReason]) {
      const err = new Error("A valid issueReason is required for order issue tickets");
      err.status = 400;
      throw err;
    }
    const taxonomy = ISSUE_TAXONOMY_MAP[issueReason];
    if (subReason && !taxonomy.subreasons.some((s) => s.code === subReason)) {
      const err = new Error("Invalid subReason for the selected issueReason");
      err.status = 400;
      throw err;
    }

    const minRequired = taxonomy.noEvidenceRequired ? 0 : taxonomy.minEvidenceCount || 0;
    if (evidenceFiles.length < minRequired) {
      const err = new Error(
        `At least ${minRequired} photo${minRequired === 1 ? "" : "s"} of evidence ${
          minRequired === 1 ? "is" : "are"
        } required for this issue type`
      );
      err.status = 400;
      throw err;
    }
  }

  const ticketNo = await generateUniqueTicketNo();

  const ticket = await SupportTicket.create({
    ticketNo,
    raisedBy: {
      user: requester._id,
      role: raiserRole,
      name: `${requester.firstName} ${requester.lastName}`.trim(),
      email: requester.email
    },
    subject,
    category,
    issueReason: issueReason || null,
    subReason: subReason || null,
    evidence: evidenceFiles.map((f) => ({ url: f.url, mimeType: f.mimeType, capturedLive: true })),
    priority: priority || "medium",
    relatedOrder: relatedOrder || null,
    relatedOrderItem: relatedOrderItem || null,
    relatedProduct: relatedProduct || null,
    relatedShop: relatedShop || null,
    lastMessagePreview: message.slice(0, 140),
    lastMessageByRole: raiserRole,
    unreadByAdmin: true
  });

  await SupportMessage.create({
    ticketId: ticket._id,
    ticketNo: ticket.ticketNo,
    sender: { _id: requester._id, role: raiserRole, name: ticket.raisedBy.name },
    message,
    attachments: evidenceFiles.map((f) => ({ name: f.originalname || "evidence.jpg", url: f.url }))
  });

  return ticket;
}

async function getMyTickets({ requesterId, status }) {
  const filter = { "raisedBy.user": requesterId };
  if (status) filter.status = status;
  return SupportTicket.find(filter).sort({ lastMessageAt: -1 });
}

async function getTicketById({ id, requester }) {
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  const staff = isStaff(requester.role);
  const owner = ticket.raisedBy.user.toString() === requester._id.toString();
  if (!staff && !owner) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  const messageFilter = { ticketId: ticket._id };
  if (!staff) messageFilter.isInternalNote = false;
  const messages = await SupportMessage.find(messageFilter).sort({ createdAt: 1 });

  if (staff) ticket.unreadByAdmin = false;
  else ticket.unreadByRaiser = false;
  await ticket.save();

  return { ticket, messages };
}

async function replyToTicket({ id, requester, body }) {
  const { message, attachments, isInternalNote } = body;
  if (!message) {
    const err = new Error("message is required");
    err.status = 400;
    throw err;
  }

  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  const staff = isStaff(requester.role);
  const owner = ticket.raisedBy.user.toString() === requester._id.toString();
  if (!staff && !owner) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  if (ticket.status === "closed") {
    const err = new Error("This ticket is closed. Raise a new ticket instead.");
    err.status = 400;
    throw err;
  }

  const senderRole = staff ? "admin" : ticket.raisedBy.role;
  const senderName = staff ? `${requester.firstName} ${requester.lastName}`.trim() : ticket.raisedBy.name;
  const note = staff && isInternalNote === true;

  await SupportMessage.create({
    ticketId: ticket._id,
    ticketNo: ticket.ticketNo,
    sender: { _id: requester._id, role: senderRole, name: senderName },
    message,
    attachments: attachments || [],
    isInternalNote: note
  });

  if (!note) {
    ticket.lastMessageAt = new Date();
    ticket.lastMessagePreview = message.slice(0, 140);
    ticket.lastMessageByRole = senderRole;
    ticket.unreadByAdmin = !staff;
    ticket.unreadByRaiser = staff;
    if (staff && ticket.status === "open") ticket.status = "in_progress";
    if (!staff && ticket.status === "awaiting_reply") ticket.status = "in_progress";
  }
  await ticket.save();

  return ticket;
}

async function getAllTickets(query) {
  const { status, category, priority, role, assignedTo, search, page = 1, limit = 20 } = query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (role) filter["raisedBy.role"] = role;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (search) {
    filter.$or = [
      { ticketNo: new RegExp(search, "i") },
      { subject: new RegExp(search, "i") },
      { "raisedBy.email": new RegExp(search, "i") }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter).sort({ priority: -1, lastMessageAt: -1 }).skip(skip).limit(Number(limit)),
    SupportTicket.countDocuments(filter)
  ]);

  return { tickets, total, page: Number(page), pages: Math.ceil(total / limit) };
}

async function updateStatus({ id, status }) {
  const valid = ["open", "in_progress", "awaiting_reply", "resolved", "closed"];
  if (!valid.includes(status)) {
    const err = new Error("Invalid status");
    err.status = 400;
    throw err;
  }

  const update = { status };
  if (status === "resolved") update.resolvedAt = new Date();
  if (status === "closed") update.closedAt = new Date();

  const ticket = await SupportTicket.findByIdAndUpdate(id, update, { new: true });
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }
  return ticket;
}

async function assignTicket({ id, adminId }) {
  const ticket = await SupportTicket.findByIdAndUpdate(id, { assignedTo: adminId || null }, { new: true });
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }
  return ticket;
}

async function decideTicket({ id, admin, decision, note }) {
  const valid = ["return_refund", "refund_only", "replacement", "repair", "declined"];
  if (!valid.includes(decision)) {
    const err = new Error("Invalid decision");
    err.status = 400;
    throw err;
  }

  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }
  if (ticket.category !== "order_issue") {
    const err = new Error("Decisions can only be recorded on order_issue tickets");
    err.status = 400;
    throw err;
  }

  let policyAligned = null;
  try {
    const { getIssueEligibility } = require("./issue-eligibility.service");
    if (ticket.relatedOrderItem) {
      const eligibility = await getIssueEligibility({
        orderItemId: ticket.relatedOrderItem,
        buyerId: ticket.raisedBy.user
      });
      const reasonInfo = eligibility.reasons.find((r) => r.code === ticket.issueReason);
      if (reasonInfo?.policy) {
        const returnsAccepted = reasonInfo.policy.returnsAccepted;
        if (decision === "return_refund" || decision === "refund_only") {
          policyAligned = returnsAccepted;
        } else if (decision === "declined") {
          policyAligned = true;
        } else {
          policyAligned = null;
        }
      }
    }
  } catch (e) {
    policyAligned = null;
  }

  ticket.resolution = {
    decision,
    note: note || null,
    decidedBy: admin._id,
    decidedAt: new Date(),
    policyAligned
  };
  ticket.status = "resolved";
  ticket.resolvedAt = new Date();
  await ticket.save();

  const DECISION_LABELS = {
    return_refund: "Return & refund approved",
    refund_only: "Refund approved (no return required)",
    replacement: "Replacement approved",
    repair: "Repair approved",
    declined: "Claim declined"
  };

  await SupportMessage.create({
    ticketId: ticket._id,
    ticketNo: ticket.ticketNo,
    sender: { _id: admin._id, role: "admin", name: `${admin.firstName} ${admin.lastName}`.trim() },
    message: `${DECISION_LABELS[decision]}.${note ? " " + note : ""}`,
    isInternalNote: false
  });

  return ticket;
}

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  replyToTicket,
  getAllTickets,
  updateStatus,
  assignTicket,
  decideTicket
};