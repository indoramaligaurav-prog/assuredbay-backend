// models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Stripe", "PayPal", "COD"],
    },
    orderNo:  { type: String, required: true },
    paymentId:{ type: String },

    subTotal:   { type: Number, required: true },
    total:      { type: Number, required: true },
    totalItems: { type: Number, required: true },
    shipping:   { type: Number, required: true },
    discount:   { type: Number, default: 0 },

    currency:       { type: String, required: false },
    conversionRate: { type: Number, required: false },

    // Overall order status (platform-level)
    status: {
      type: String,
      enum: ["pending", "processing", "partial_shipped", "delivered", "cancelled", "returned"],
      default: "pending",
    },

    note: { type: String },

    // Coupon ref (optional)
    couponCode: { type: String },

    // Customer info — stored here, NEVER exposed to vendor
    user: {
      _id:       { type: mongoose.Types.ObjectId },
      firstName: { type: String, required: true },
      lastName:  { type: String, required: true },
      email:     { type: String, required: true },
      phone:     { type: String, required: true },
      address:   { type: String, required: true },
      city:      { type: String, required: true },
      zip:       { type: String, required: true },
      country:   { type: String, required: true },
      state:     { type: String, required: true },
    },

    // Separate shipping address if user chose "ship to different address"
    shippingAddress: {
      firstName: String,
      lastName:  String,
      email:     String,
      phone:     String,
      address:   String,
      city:      String,
      zip:       String,
      country:   String,
      state:     String,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
module.exports = Order;