const mongoose = require("mongoose");
const { Schema } = mongoose;

const profileGradeSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true }, // new, rising, verified, pro, review
    name: { type: String, required: true },
    description: { type: String, default: "" },
    isDefault: { type: Boolean, default: false }, // assigned when a vendor is created
    isActive: { type: Boolean, default: true },

    // Evaluation: highest priority first, first grade whose rules pass wins, default grade is the fallback
    priority: { type: Number, required: true },

    eligibility: {
      minCompletedOrders: { type: Number, default: 0 },
      maxCompletedOrders: { type: Number, default: null }, // null = no upper limit
      windowDays: { type: Number, default: 90 },
      minWeightedIncidents: { type: Number, default: null }, // used by Review
      maxWeightedIncidents: { type: Number, default: null }, // used by Verified / Pro
      maxLateShipRate: { type: Number, default: null }, // 0.05 = 5%
      minReplyRate: { type: Number, default: null }, // 0.9 = 90%
      requiresSubscription: { type: Boolean, default: false }
    },

    // What buyers see. Empty array = no badge.
    badges: [{ label: String, icon: String, color: String }],

    // What the seller gets
    searchBoost: { type: Number, default: 1 },
    searchHidden: { type: Boolean, default: false },
    perks: [{ type: String }]
  },
  { timestamps: true }
);

module.exports = mongoose.models.ProfileGrade || mongoose.model("ProfileGrade", profileGradeSchema);