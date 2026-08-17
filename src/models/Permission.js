const mongoose = require("mongoose");

const PermissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "shops.view", "products.approve"
    module: { type: String, required: true },              // e.g. "shops", "products", "brands", "orders", "users"
    action: { type: String, required: true },               // e.g. "view", "edit", "delete", "approve", "status_update"
    label: { type: String, required: true },                 // "View Shops", "Approve Products"
  },
  { timestamps: true }
);

module.exports = mongoose.models.Permission || mongoose.model("Permission", PermissionSchema);