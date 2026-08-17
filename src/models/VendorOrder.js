const mongoose = require("mongoose");

const VendorOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    orderNo: {
      type: String,
      required: true,
    },
    vendorId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    items: {
      type: Array,
      required: true,
    },
    subTotal: Number,
    shipping: Number,
    total: Number,

    status: {
      type: String,
      enum: ["pending", "on-the-way", "delivered", "canceled"],
      default: "pending",
    },

    courierName: {
      type: String,
      default: "",
    },
    trackingLink: {
      type: String,
      default: "",
    },
    trackingId: String,

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.VendorOrder ||
  mongoose.model("VendorOrder", VendorOrderSchema);