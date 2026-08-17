const mongoose = require('mongoose');

const ReturnPolicySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  return_allowed: { type: Boolean, default: true },
  return_window_days: { type: Number },
  return_shipping_payer: {
    type: String,
    enum: ['buyer', 'seller'],
    default: 'buyer'
  },
  refund_mode: {
    type: String,
    enum: ['original', 'wallet', 'replacement'],
    default: 'original'
  },
  replacement_allowed: { type: Boolean, default: false },
  status: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('ReturnPolicy', ReturnPolicySchema);
