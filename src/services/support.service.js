const SupportTicket = require("../models/SupportTicket");
const SupportMessage = require("../models/SupportMessage");
const { ISSUE_TAXONOMY_MAP } = require("../constants/issue-taxonomy");
const Product = require("../models/Product");
const { checkMessage } = require("../utils/contact-filter");

const VENDOR_RESPONSE_WINDOW_HOURS = 48;

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

    // Vendor-first routing — only for order_issue tickets tied to a real
  // product with a resolvable vendor. General/account/payment queries are
  // unaffected and go straight to admin as before.
  let vendorId = null;
  let currentHandler = "admin";
  let vendorRespondDeadline = null;
  let initialStatus = "open";

  if (category === "order_issue" && relatedProduct) {
    const product = await Product.findById(relatedProduct).select("vendor");
    if (product?.vendor) {
      vendorId = product.vendor;
      currentHandler = "vendor";
      vendorRespondDeadline = new Date(Date.now() + VENDOR_RESPONSE_WINDOW_HOURS * 60 * 60 * 1000);
      initialStatus = "awaiting_vendor_response";
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
    status: initialStatus,
    currentHandler,
    vendor: vendorId,
    vendorRespondDeadline,
    relatedOrder: relatedOrder || null,
    relatedOrderItem: relatedOrderItem || null,
    relatedProduct: relatedProduct || null,
    relatedShop: relatedShop || null,
    lastMessagePreview: message.slice(0, 140),
    lastMessageByRole: raiserRole,
    unreadByAdmin: currentHandler === "admin",
    unreadByVendor: currentHandler === "vendor"
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
  const isAssignedVendor = ticket.vendor && ticket.vendor.toString() === requester._id.toString();
  if (!staff && !owner && !isAssignedVendor) {
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
  const isAssignedVendor = ticket.vendor && ticket.vendor.toString() === requester._id.toString();
  if (!staff && !owner && !isAssignedVendor) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  

  if (ticket.status === "closed") {
    const err = new Error("This ticket is closed. Raise a new ticket instead.");
    err.status = 400;
    throw err;
  }

  const senderRole = staff ? "admin" : (requester._id?.toString() === ticket.vendor?.toString() ? "vendor" : ticket.raisedBy.role);

  // Contact-info filtering applies to vendor/customer messages only —
  // admins are exempt since they may legitimately need to reference
  // official support channels.
  let filterResult = { blocked: false, flagged: false, reason: null };
  if (!staff) {
    filterResult = checkMessage(message);
    if (filterResult.blocked) {
      const err = new Error(
        "Contact details or off-platform links can't be shared here — please keep all communication on Assuredbay so both sides stay protected."
      );
      err.status = 400;
      throw err;
    }
  }
  const senderName = staff ? `${requester.firstName} ${requester.lastName}`.trim() : ticket.raisedBy.name;
  const note = staff && isInternalNote === true;

  await SupportMessage.create({
    ticketId: ticket._id,
    ticketNo: ticket.ticketNo,
    sender: { _id: requester._id, role: senderRole, name: senderName },
    message,
    attachments: attachments || [],
    isInternalNote: note,
    flaggedForReview: filterResult.flagged,
    flagReason: filterResult.reason
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

/**
 * Vendor records a decision on a ticket currently in their court. Moves
 * the ball to the customer — does NOT resolve the ticket itself.
 */
async function vendorDecide({ id, vendor, decision, note }) {
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
  if (!ticket.vendor || ticket.vendor.toString() !== vendor._id.toString()) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }
  if (ticket.currentHandler !== "vendor") {
    const err = new Error("This ticket is not currently awaiting a vendor response");
    err.status = 400;
    throw err;
  }

  ticket.vendorDecision = { decision, note: note || null, decidedAt: new Date() };
  ticket.currentHandler = "customer";
  ticket.status = "awaiting_customer_decision";
  ticket.vendorRespondDeadline = null;
  ticket.unreadByRaiser = true;
  await ticket.save();

  const DECISION_LABELS = {
    return_refund: "offered a return & refund",
    refund_only: "offered a refund (no return required)",
    replacement: "offered a replacement",
    repair: "offered a repair",
    declined: "declined the claim"
  };

  await SupportMessage.create({
    ticketId: ticket._id,
    ticketNo: ticket.ticketNo,
    sender: { _id: vendor._id, role: "vendor", name: `${vendor.firstName} ${vendor.lastName}`.trim() },
    message: `Vendor ${DECISION_LABELS[decision]}.${note ? " " + note : ""}`
  });

  return ticket;
}

/**
 * Customer responds to the vendor's decision — either accepts (closes the
 * ticket) or rejects (escalates to admin). No timeout auto-accepts;
 * silence just leaves the ticket sitting in awaiting_customer_decision.
 */
async function customerRespond({ id, customer, accepted, note }) {
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }
  if (ticket.raisedBy.user.toString() !== customer._id.toString()) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }
  if (ticket.currentHandler !== "customer") {
    const err = new Error("This ticket is not currently awaiting your decision");
    err.status = 400;
    throw err;
  }

  ticket.customerFeedback = { accepted: Boolean(accepted), note: note || null, respondedAt: new Date() };

  if (accepted) {
    ticket.resolution = {
      decision: ticket.vendorDecision.decision,
      note: ticket.vendorDecision.note,
      decidedBy: ticket.vendor,
      decidedAt: ticket.vendorDecision.decidedAt,
      policyAligned: null
    };
    ticket.status = "resolved";
    ticket.currentHandler = "vendor"; // resolved, but keep last-handler context; UI reads `status` for closed state
    ticket.resolvedAt = new Date();
  } else {
    ticket.currentHandler = "admin";
    ticket.status = "escalated";
    ticket.escalation = { escalated: true, reason: "customer_rejected", escalatedAt: new Date() };
    ticket.unreadByAdmin = true;
  }
  await ticket.save();

  await SupportMessage.create({
    ticketId: ticket._id,
    ticketNo: ticket.ticketNo,
    sender: { _id: customer._id, role: ticket.raisedBy.role, name: ticket.raisedBy.name },
    message: accepted
      ? `Customer accepted the vendor's decision.${note ? " " + note : ""}`
      : `Customer was not satisfied with the vendor's decision — escalated to Assuredbay support.${note ? " " + note : ""}`
  });

  return ticket;
}

/**
 * Called by the cron job — sweeps vendor-held tickets past their 48h
 * deadline and escalates them to admin.
 */
async function escalateOverdueVendorTickets() {
  const overdue = await SupportTicket.find({
    currentHandler: "vendor",
    status: "awaiting_vendor_response",
    vendorRespondDeadline: { $lte: new Date() }
  });

  for (const ticket of overdue) {
    ticket.currentHandler = "admin";
    ticket.status = "escalated";
    ticket.escalation = { escalated: true, reason: "vendor_timeout", escalatedAt: new Date() };
    ticket.unreadByAdmin = true;
    await ticket.save();

    await SupportMessage.create({
      ticketId: ticket._id,
      ticketNo: ticket.ticketNo,
      sender: { _id: ticket.vendor, role: "vendor", name: "System" },
      message: "Vendor did not respond within 48 hours — this ticket has been escalated to Assuredbay support."
    });
  }

  return overdue.length;
}

async function getTicketsForVendor({ vendorId, status, currentHandler }) {
  const filter = { vendor: vendorId };
  if (status) filter.status = status;
  if (currentHandler) filter.currentHandler = currentHandler;
  return SupportTicket.find(filter).sort({ lastMessageAt: -1 });
}

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  replyToTicket,
  getAllTickets,
  updateStatus,
  assignTicket,
  decideTicket,
  vendorDecide,
  customerRespond,
  escalateOverdueVendorTickets,
  getTicketsForVendor
};