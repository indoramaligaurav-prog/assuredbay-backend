const mongoose = require("mongoose");

const ProductConditionMasterSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    // Human-readable, condition-specific phrasing shown in admin tooling.
    // NOT used for eligibility filtering — filtering matches on
    // ISSUE_TAXONOMY[].conditions (stable codes), not these free-text
    // strings, since they don't line up 1:1 with taxonomy entries
    // (e.g. AS_IS has no "damaged" line, OVERHAULED has an extra one).
    queryConditions: [{ type: String }],
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Explicit collection name — matches the existing Atlas collection exactly,
// since mongoose's default pluralization ("productconditionmasters") won't.
module.exports = mongoose.model(
  "ProductConditionMaster",
  ProductConditionMasterSchema,
  "productConditionMaster"
);