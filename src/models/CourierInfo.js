const mongoose = require("mongoose");

const CourierInfoSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
    },
    shopId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Shop",
    },
    orderId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Order",
    },
    courierName: {
      type: String,
      required: true,
    },
    trackingId: {
      type: String,
      required: true,
    },
    trackingLink: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const CourierInfo =
  mongoose.models.CourierInfo ||
  mongoose.model("CourierInfo", CourierInfoSchema);
module.exports = CourierInfo;
