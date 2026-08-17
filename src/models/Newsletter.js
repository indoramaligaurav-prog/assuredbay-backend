const mongoose = require("mongoose");

const NewsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: [true, "email-required"],
      index: true,
    },
  },
  { timestamps: true }
);

const Newsletter =
  mongoose.models.Newsletter || mongoose.model("Newsletter", NewsletterSchema);
module.exports = Newsletter;
