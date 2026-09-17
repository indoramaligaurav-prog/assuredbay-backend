const mongoose = require("mongoose");
const { Schema } = mongoose;

const supportTicketSchema = new Schema(
  {
    ticketNo: { type: String, required: true, unique: true },

    raisedBy: {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, enum: ["user", "vendor"], required: true },
      name: { type: String, required: true },
      email: { type: String, required: true }
    },

    subject: { type: String, required: true, trim: true, maxlength: 150 },

    category: {
      type: String,
      enum: [
        "order_issue",
        "payment_issue",
        "product_issue",
        "payout_issue",
        "account_issue",
        "technical",
        "other"
      ],
      required: true
    },

    issueReason: {
      type: String,
      enum: [
        "wrong_item",
        "condition_mismatch",
        "missing_parts",
        "not_working",
        "damaged_in_delivery",
        "not_received",
        "authenticity_safety",
        null
      ],
      default: null
    },
    subReason: { type: String, default: null },

    evidence: [
      {
        url: { type: String, required: true },
        mimeType: { type: String },
        capturedLive: { type: Boolean, default: true },
        capturedAt: { type: Date, default: Date.now }
      }
    ],

    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },

    // Phase 3 — vendor-first routing. Existing statuses kept as-is for
    // general/non-order queries; the four new values are only used on the
    // vendor-routed order_issue path so nothing else in the app that reads
    // `status` needs to change.
    status: {
      type: String,
      enum: [
        "open",
        "in_progress",
        "awaiting_reply",
        "awaiting_vendor_response",
        "awaiting_customer_decision",
        "escalated",
        "resolved",
        "closed"
      ],
      default: "open"
    },

    // Who the ball is currently in the court of. Drives which
    // vendor/admin/customer dashboard queue a ticket shows up in, and which
    // action endpoints are allowed to mutate it right now.
    currentHandler: { type: String, enum: ["vendor", "customer", "admin"], default: "admin" },

    relatedOrder: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    relatedOrderItem: { type: Schema.Types.ObjectId, ref: "OrderItem", default: null },
    relatedProduct: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    relatedShop: { type: Schema.Types.ObjectId, ref: "Shop", default: null },

    // Resolved once at creation from Product.vendor — deliberately not
    // re-derived later, so a ticket doesn't silently reassign if a
    // product's vendor changes mid-flight.
    vendor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    vendorRespondDeadline: { type: Date, default: null },

    vendorDecision: {
      decision: {
        type: String,
        enum: ["return_refund", "refund_only", "replacement", "repair", "declined", null],
        default: null
      },
      note: { type: String, default: null },
      decidedAt: { type: Date, default: null }
    },

    customerFeedback: {
      accepted: { type: Boolean, default: null },
      note: { type: String, default: null },
      respondedAt: { type: Date, default: null }
    },

    escalation: {
      escalated: { type: Boolean, default: false },
      reason: { type: String, enum: ["vendor_timeout", "customer_rejected", null], default: null },
      escalatedAt: { type: Date, default: null }
    },

    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },

    // Final, authoritative decision — set by admin directly for non-vendor
    // tickets, or by admin after an escalation. Kept separate from
    // vendorDecision so both are visible in the audit trail even when
    // admin overturns what the vendor decided.
    resolution: {
      decision: {
        type: String,
        enum: ["return_refund", "refund_only", "replacement", "repair", "declined", null],
        default: null
      },
      note: { type: String, default: null },
      decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
      decidedAt: { type: Date, default: null },
      policyAligned: { type: Boolean, default: null }
    },

    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, default: "" },
    lastMessageByRole: { type: String, enum: ["user", "vendor", "admin"], default: null },

    unreadByAdmin: { type: Boolean, default: true },
    unreadByRaiser: { type: Boolean, default: false },
    unreadByVendor: { type: Boolean, default: false },

    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

supportTicketSchema.index({ "raisedBy.user": 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportTicketSchema.index({ ticketNo: 1 }, { unique: true });
supportTicketSchema.index({ relatedOrderItem: 1 });
supportTicketSchema.index({ vendor: 1, currentHandler: 1 });
supportTicketSchema.index({ currentHandler: 1, vendorRespondDeadline: 1 });

supportTicketSchema.statics.generateTicketNo = function () {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SUP-${rand}`;
};

module.exports = mongoose.model("SupportTicket", supportTicketSchema);