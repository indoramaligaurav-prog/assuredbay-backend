const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema(
  {
    country_code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    kyc_docs: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

const Zone = mongoose.models.Zone || mongoose.model('Zone', ZoneSchema);; 
module.exports = Zone;