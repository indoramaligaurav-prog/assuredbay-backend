const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * SupportMessage
 * Individual messages within a SupportTicket thread.
 */
const supportMessageSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "SupportTicket", required: true },
    ticketNo: { type: String, required: true },

    sender: {
      _id: { type: Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, enum: ["user", "vendor", "admin"], required: true },
      name: { type: String, required: true },
    },

    message: { type: String, required: true, trim: true, maxlength: 5000 },

    attachments: [
      {
        name: String,
        url: String,
      },
    ],

    // Admin-only note, hidden from the customer/vendor thread view
    isInternalNote: { type: Boolean, default: false },
    flaggedForReview: { type: Boolean, default: false },
    flagReason: { type: String, default: null }
  },
  { timestamps: true }
);

supportMessageSchema.index({ ticketId: 1, createdAt: 1 });

module.exports = mongoose.model("SupportMessage", supportMessageSchema);