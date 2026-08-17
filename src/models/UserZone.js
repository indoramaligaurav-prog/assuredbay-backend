const mongoose = require('mongoose');

const UserZoneSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Each user can have only one zone
    },
    country: {
      type: String,
      required: [true, 'Please enter a country'],
    },
    country_code: {
      type: String,
      required: [false, 'Please enter country code'],
    },
    state: {
      type: String,
      required: [true, 'Please enter a state'],
    },
    city: {
      type: String,
      required: [true, 'Please enter a city'],
    },
    pincode: {
      type: String,
      required: [true, 'Please enter a pincode/zip'],
    },
    address: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Export the model
const UserZone = mongoose.models.UserZone || mongoose.model('UserZone', UserZoneSchema);
module.exports = UserZone;
   