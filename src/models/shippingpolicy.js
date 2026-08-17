const mongoose = require('mongoose');

const ShippingPolicySchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  policy_type: {
    type: String,
    enum: ['FREE', 'COURIER', 'FREIGHT'],
    required: true
  },

  max_weight_allowed: {
    type: Number,
    default: null // null = no limit
  },

  courier_allowed: {
    type: Boolean,
    required: true
  },

  status: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model('ShippingPolicy', ShippingPolicySchema);
