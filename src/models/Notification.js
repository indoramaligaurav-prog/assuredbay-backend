const mongoose = require("mongoose");

const NotificationsSchema = new mongoose.Schema(
  {
    opened: {
      type: Boolean,
      default: false,
    },

    title: {
      type: String,
      required: true,
      maxlength: 200,
    },

    message: {
      type: String,
    },

    type: {
      type: String,
      enum: [
        "order",
        "vendor_registration",
        "shop_approved",
        "shop_rejected",
        "payment",
        "system"
      ],
      required: true,
    },

    // 🔗 Dynamic references
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    // Optional media
    cover: {
      _id: String,
      url: String,
    },

    // Extra flexible data (VERY POWERFUL 🔥)
    meta: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

const Notifications =
  mongoose.models.Notifications ||
  mongoose.model("Notifications", NotificationsSchema);

module.exports = Notifications;