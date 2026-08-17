const mongoose = require('mongoose');

const QuoteRequestSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    templateKey: {
      type: String,
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    deliveryLocation: {
      country: {
        type: String,
        required: true
      },
      pincode: {
        type: String,
        required: true
      }
    },

    freightType: {
      type: String,
      enum: ['AIR', 'SEA'],
      default: null
    },

    notifyWhatsapp: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ['pending', 'responded', 'accepted', 'rejected'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuoteRequest', QuoteRequestSchema);
