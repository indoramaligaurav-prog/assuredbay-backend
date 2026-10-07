const mongoose = require("mongoose");
const { Schema } = mongoose;

const callRequestSchema = new Schema(
  {
    ticket: { type: Schema.Types.ObjectId, ref: "SupportTicket", required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    orderItem: { type: Schema.Types.ObjectId, ref: "OrderItem", default: null },
    product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    vendor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    slotStart: { type: Date, required: true },
    slotEnd: { type: Date, required: true },
    vendorPhone: { type: String, required: true, trim: true },
    note: { type: String, default: "", maxlength: 500 },
    status: {
      type: String,
      enum: ["requested", "confirmed", "declined", "completed", "cancelled"],
      default: "requested"
    },
    snapshot: {
      ticketNo: String,
      orderNo: String,
      productName: String,
      productSlug: String,
      vendorName: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.CallRequest || mongoose.model("CallRequest", callRequestSchema);