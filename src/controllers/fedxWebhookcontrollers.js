const OrderItem  = require('../models/OrderItem');
const Order  = require('../models/Order');
const Shop   = require('../models/Shop');
const User   = require('../models/User');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// FedEx event → your vendorStatus
const FEDEX_STATUS_MAP = {
  OC:  'processing',       // Order Created
  PU:  'processing',       // Picked Up
  IT:  'shipped',          // In Transit
  OD:  'out_for_delivery', // Out for Delivery
  DL:  'delivered',        // Delivered
  CA:  'cancelled',        // Cancelled
};

const fedexWebhook = async (req, res) => {
  try {
    const events = req.body?.event || req.body?.events || [];
    const list   = Array.isArray(events) ? events : [events];

    for (const event of list) {
      const trackingNumber = event?.trackingInfo?.trackingNumber
                          || event?.trackingNumber;
      const eventCode      = event?.eventType || event?.eventCode;

      if (!trackingNumber || !eventCode) continue;

      const newStatus = FEDEX_STATUS_MAP[eventCode];
      if (!newStatus) continue;

      const item = await OrderItem.findOneAndUpdate(
        { trackingNumber },
        { vendorStatus: newStatus },
        { new: true }
      );

      if (item && newStatus === 'delivered') {
        await releaseVendorPayout(item);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('FedEx webhook error:', err.message);
    return res.status(200).json({ received: true }); // always 200 to FedEx
  }
};

async function releaseVendorPayout(item) {
  try {
    if (item.payoutStatus === 'released') return; // idempotency guard — don't double-pay

    const order = await Order.findById(item.orderId).lean();
    if (!order) throw new Error('Order not found for payout');

    const shop = await Shop.findOne({ vendor: item.vendorId }).lean();
    if (!shop?.stripeAccountId) throw new Error('Vendor has no Stripe account');
    if (!shop.payoutsEnabled) throw new Error('Vendor payouts not enabled on Stripe yet');

    const vendorUser = await User.findById(item.vendorId).lean();
    const commissionPercent = vendorUser?.commission || 0;

    const commissionAmount = (item.subtotal * commissionPercent) / 100;
    const payoutAmount = item.subtotal - commissionAmount;

    const amountInSmallestUnit = Math.round(payoutAmount * 100);

    const transfer = await stripe.transfers.create({
      amount: amountInSmallestUnit,
      currency: order.currency || 'usd',
      destination: shop.stripeAccountId,
      metadata: {
        orderItemId: item._id.toString(),
        orderNo: item.orderNo,
      },
    });

    await OrderItem.findByIdAndUpdate(item._id, {
      payoutStatus: 'released',
      transferId: transfer.id,
      payoutAmount,
    });

  } catch (err) {
    console.error('Vendor payout error:', err.message);
    await OrderItem.findByIdAndUpdate(item._id, {
      payoutStatus: 'failed',
      payoutError: err.message,
    });
  }
}

module.exports = { fedexWebhook };