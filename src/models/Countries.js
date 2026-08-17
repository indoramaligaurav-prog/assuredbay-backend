const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
     currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },

    currency_symbol: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Country = mongoose.models.Country || mongoose.model('Country', countrySchema);
module.exports = Country;
