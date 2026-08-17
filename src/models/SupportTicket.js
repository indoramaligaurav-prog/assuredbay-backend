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

    // Phase 2 addition — live-captured photos submitted with the ticket.
    // capturedLive is always true here since the frontend never offers a
    // gallery-upload path; kept explicit in the schema as a marker in case a
    // future upload path is added and needs to be distinguished.
    evidence: [
      {
        url: { type: String, required: true },
        mimeType: { type: String },
        capturedLive: { type: Boolean, default: true },
        capturedAt: { type: Date, default: Date.now }
      }
    ],

    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    status: {
      type: String,
      enum: ["open", "in_progress", "awaiting_reply", "resolved", "closed"],
      default: "open"
    },

    relatedOrder: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    relatedOrderItem: { type: Schema.Types.ObjectId, ref: "OrderItem", default: null },
    relatedProduct: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    relatedShop: { type: Schema.Types.ObjectId, ref: "Shop", default: null },

    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },

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

    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

supportTicketSchema.index({ "raisedBy.user": 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportTicketSchema.index({ ticketNo: 1 }, { unique: true });
supportTicketSchema.index({ relatedOrderItem: 1 });

supportTicketSchema.statics.generateTicketNo = function () {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SUP-${rand}`;
};

module.exports = mongoose.model("SupportTicket", supportTicketSchema);