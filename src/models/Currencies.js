const mongoose = require("mongoose");

const CurrencySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      index: true,
    },
    code: {
      type: String,
      unique: true,
      required: [true, "Code is required."],
      index: true,
    },
    country: {
      type: String,
      minlength: 4,
      required: [true, "Country is required."],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    rateType: {
      type: String,
      enum: ["default", "custom"],
      default: "default",
    },
    base: {
      type: Boolean,
      default: false,
    },
    rate: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Currency =
  mongoose.models.Currency || mongoose.model("Currency", CurrencySchema);
module.exports = Currency;
