const mongoose = require("mongoose");

const AdminRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // "Sales Agent", "Support"
    description: { type: String },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
  },
  { timestamps: true }
);

module.exports = mongoose.models.AdminRole || mongoose.model("AdminRole", AdminRoleSchema);