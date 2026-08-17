const mongoose = require('mongoose');

const QuoteMessageSchema = new mongoose.Schema(
  {
    quote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuoteRequest',
      required: true
    },

    senderType: {
      type: String,
      enum: ['vendor', 'buyer', 'system'],
      required: true
    },

    // NEW: business meaning of message
    messageType: {
      type: String,
      enum: [
        'TEXT',
        'PRICE_OFFER',
        'PRICE_ACCEPTED',
        'PRICE_REJECTED'
      ],
      default: 'TEXT'
    },

    // OPTIONAL (for backward compatibility)
    messageKey: {
      type: String,
      required: false
    },

    messageText: {
      type: String,
      required: true
    },

    // NEW: structured data (price, etc.)
    payload: {
      type: Object,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuoteMessage', QuoteMessageSchema);
