const mongoose = require("mongoose");

const PolicySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "privacy-policy",
        "terms-and-conditions",
        "refund-and-return-policy",
      ],
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Policy = mongoose.models.Policy || mongoose.model("Policy", PolicySchema);
module.exports = Policy;
