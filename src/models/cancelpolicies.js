const mongoose = require('mongoose');

const CancelPolicySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  cancellation_allowed: {
    type: Boolean,
    default: true
  },

  cancel_before_hours: {
    type: Number,
    required: function () {
      return this.cancellation_allowed === true;
    },
    min: 0
  },

  refund_mode: {
    type: String,
    enum: ['original', 'wallet', 'replacement'],
    default: 'original'
  },

  status: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model('CancelPolicy', CancelPolicySchema);
