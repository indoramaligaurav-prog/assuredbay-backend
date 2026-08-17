// models/OrderItem.js
const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNo: {
      type: String,
      required: true,
    },
    vendorId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Product snapshot (so if product is deleted, order history stays intact)
    productId: {
      type: mongoose.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    imageUrl:    { type: String },
    quantity:    { type: Number, required: true },
    unitPrice:   { type: Number, required: true },
    subtotal:    { type: Number, required: true },

    // Variant info (size, color, etc.) — optional
    variant: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    rejectReason: { type: String, default: '' },
    // Quoted shipping per item (for your isQuoted logic)
    shipping: { type: Number, default: 0 },
    isQuoted: { type: Boolean, default: false },

    // Vendor fulfillment status (vendor manages this)
    trackingNumber: String,
labelUrl: String,       // path to stored PDF
shipmentId: String,     // FedEx shipment ID for reference
    vendorStatus: {
      type: String,
      enum: ['pending','approved','rejected','processing','shipped','out_for_delivery','delivered','cancelled'],
      default: "pending",
    },
    payoutStatus: {
  type: String,
  enum: ['pending', 'released', 'failed'],
  default: 'pending',
},
transferId: { type: String },
payoutAmount: { type: Number },
payoutError: { type: String },

    // Tracking (vendor fills this in their dashboard)
    courierName:   { type: String, default: "" },
    trackingId:    { type: String, default: "" },
    trackingLink:  { type: String, default: "" },
    shippedAt:     { type: Date },
    deliveredAt:   { type: Date },
    shippingService:  { type: String, default: null },
    shippingCurrency: { type: String, default: null },

    // FedEx pickup scheduling
    pickupConfirmationNumber: { type: String, default: '' },
    pickupDate:        { type: Date, default: null },
    pickupReadyTime:   { type: String, default: '' }, // e.g. "11:00:00"
    pickupCloseTime:   { type: String, default: '' }, // e.g. "18:00:00"

  },
  {
    timestamps: true,
  }
);

// Useful compound index: fetch all items for a vendor quickly
OrderItemSchema.index({ vendorId: 1, vendorStatus: 1 });
OrderItemSchema.index({ orderId: 1, vendorId: 1 });

const OrderItem =
  mongoose.models.OrderItem || mongoose.model("OrderItem", OrderItemSchema);

module.exports = OrderItem;