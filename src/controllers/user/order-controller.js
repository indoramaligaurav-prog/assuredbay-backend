// controllers/order/index.js
const Notifications = require("../../models/Notification");
const Products      = require("../../models/Product");
const Orders        = require("../../models/Order");
const OrderItem     = require("../../models/OrderItem");   // ✅ replaces VendorOrder
const Coupons       = require("../../models/CouponCode");
const User          = require("../../models/User");
const CourierInfo   = require("../../models/CourierInfo");

const { sendEmail } = require("../../utils/mailer-util");
const fs = require('fs');
const path = require('path');

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

function isExpired(date) {
  return new Date() >= new Date(date);
}

function generateOrderNumber() {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let no = alpha.charAt(Math.floor(Math.random() * alpha.length));
  for (let i = 0; i < 6; i++) no += Math.floor(Math.random() * 10);
  return no;
}

/* ─── Create Order ─────────────────────────────────────────── */
const createOrder = async (req, res) => {
  try {
    const {
      items,
      user,
      currency,
      conversionRate,
      paymentMethod,   // 'COD' | 'STRIPE'
      paymentId,       // Stripe PaymentIntent id (sent after frontend confirms)
      couponCode,
      totalItems,
      shippingAddress,
      shipping,        // pre-calculated shipping total from frontend
      total            // pre-calculated grand total from frontend (used for Stripe amount)
    } = req.body;
 
    // ── Basic validation ─────────────────────────────────────
    if (!items?.length)
      return res.status(400).json({ success: false, message: 'Please provide item(s)' });
    if (!user?.email)
      return res.status(400).json({ success: false, message: 'User details are required' });
 
    const safeCurrency      = (currency || 'INR').toLowerCase();
    const safeConversionRate = conversionRate || 1;
 
    // ── Block admin / vendor ─────────────────────────────────
    const existingUser = await User.findOne({ email: user.email });
    if (['admin', 'vendor'].includes(existingUser?.role))
      return res.status(403).json({ success: false, message: 'Admins and vendors cannot place orders.' });
 
    // ── Fetch products ───────────────────────────────────────
    const productIds = items.map((i) => i.pid);
    const products   = await Products.find({ _id: { $in: productIds } });
 
    // ── Validate & build order items ─────────────────────────
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        const product = products.find((p) => p._id.toString() === item.pid);
        if (!product) throw new Error(`Product not found: ${item.pid}`);
        if (!item.vendorid)
          throw new Error(`Product "${product.title}" is not assigned to a vendor.`);
 
        const qty          = Number(item.acceptedQty || item.quantity);
        const unitPrice    = Number(item.price);
        const itemSubtotal = unitPrice * qty;
        const itemShipping = Number(item.shipping || 0);
 
        if (!product.variants?.length) {
          if (product.stockQuantity < qty)
            throw new Error(`Not enough stock for "${product.title}"`);
          await Products.findByIdAndUpdate(item.pid, {
            $inc: { stockQuantity: -qty, sold: qty }
          });
        }
 
        return {
          pid:              item.pid,
          vendorId:         item.vendorid,
          productName:      product.title,
          imageUrl:         item.image,
          quantity:         qty,
          unitPrice,
          subtotal:         itemSubtotal,
          variant:          item.variant || null,
          shipping:         itemShipping,
          shippingService:  item.shippingService || null,
          shippingCurrency: item.shippingCurrency || null,
          isQuoted:         item.isQuoted || false
        };
      })
    );
 
    // ── Shipping total ───────────────────────────────────────
    const calculatedShipping = updatedItems.reduce((s, i) => s + i.shipping, 0);
 
    // ── Coupon ───────────────────────────────────────────────
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupons.findOne({ code: couponCode });
      if (!coupon) throw new Error('Invalid coupon code');
      if (isExpired(coupon.expire)) throw new Error('Coupon has expired');
      await Coupons.findOneAndUpdate({ code: couponCode }, { $addToSet: { usedBy: user.email } });
      const grandTotal = updatedItems.reduce((s, i) => s + i.subtotal, 0);
      discount = coupon.type === 'percent'
        ? (coupon.discount / 100) * grandTotal
        : coupon.discount;
    }
 
    // ── Totals ───────────────────────────────────────────────
    const subTotal   = updatedItems.reduce((s, i) => s + i.subtotal, 0);
    const finalTotal = subTotal - discount + calculatedShipping;
    const orderNo    = generateOrderNumber();
 
    // ── STRIPE: create PaymentIntent before saving order ─────
    // Only for STRIPE method AND when paymentId is NOT yet provided
    // (paymentId is sent on the second call after frontend confirms)
    if (paymentMethod === 'Stripe' && !paymentId) {
      // Amount must be in smallest currency unit (paise for INR, cents for USD, etc.)
      const amountInSmallestUnit = Math.round(finalTotal * 100);
 
      const paymentIntent = await stripe.paymentIntents.create({
        amount:   amountInSmallestUnit,
        currency: safeCurrency,
        metadata: {
          orderNo,
          userEmail: user.email
        }
      });
 
      // Return clientSecret to frontend — order is NOT saved yet
      return res.status(200).json({
        success:      true,
        requiresPayment: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderNo
      });
    }
 
    // ── STRIPE: verify PaymentIntent after frontend confirms ──
    if (paymentMethod === 'Stripe' && paymentId) {
      const intent = await stripe.paymentIntents.retrieve(paymentId);
      if (intent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: `Payment not confirmed. Status: ${intent.status}`
        });
      }
    }
 
    // ── Create parent Order ──────────────────────────────────
    const order = await Orders.create({
      paymentMethod,
      paymentId:       paymentId || null,
      orderNo,
      discount,
      currency:        safeCurrency,
      conversionRate:  safeConversionRate,
      subTotal,
      total:           finalTotal,
      shipping:        calculatedShipping,
      totalItems,
      couponCode:      couponCode || null,
      note:            user.note || null,
      // STRIPE orders start as 'processing' (payment already captured)
      // COD orders start as 'pending'
      status: 'processing',
      user: existingUser ? { ...user, _id: existingUser._id } : user,
      shippingAddress: shippingAddress || null
    });
 
    // ── Create OrderItems ─────────────────────────────────────
    const orderItemDocs = updatedItems.map((item) => ({
      orderId:          order._id,
      orderNo,
      vendorId:         item.vendorId,
      productId:        item.pid,
      productName:      item.productName,
      imageUrl:         item.imageUrl,
      quantity:         item.quantity,
      unitPrice:        item.unitPrice,
      subtotal:         item.subtotal,
      variant:          item.variant,
      shipping:         item.shipping,
      shippingService:  item.shippingService,
      shippingCurrency: item.shippingCurrency,
      isQuoted:         item.isQuoted,
      vendorStatus:     'pending'
    }));
 
    await OrderItem.insertMany(orderItemDocs);
 
    // ── Link order to user ────────────────────────────────────
    if (existingUser) {
      await User.findByIdAndUpdate(existingUser._id, { $push: { orders: order._id } });
    }

    // ── Order confirmation email ───────────────────────────────

     try {
      const htmlFilePath = path.join(
        process.cwd(),
        'src/email-templates',
        'order-confirmation.html'
      );
      let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

      const itemsRows = orderItemDocs
        .map(
          (i) => `
            <tr>
              <td>${i.productName}${i.variant ? ` (${i.variant})` : ''}</td>
              <td>${i.quantity}</td>
              <td>${safeCurrency.toUpperCase()} ${i.unitPrice}</td>
              <td>${safeCurrency.toUpperCase()} ${i.subtotal}</td>
            </tr>`
        )
        .join('');

      htmlContent = htmlContent
        .replace(/{{orderNo}}/g, orderNo)
        .replace(/{{customerName}}/g, `${user.firstName} ${user.lastName}`)
        .replace(/{{itemsRows}}/g, itemsRows)
        .replace(/{{subTotal}}/g, `${safeCurrency.toUpperCase()} ${subTotal}`)
        .replace(/{{discount}}/g, `${safeCurrency.toUpperCase()} ${discount}`)
        .replace(/{{shipping}}/g, `${safeCurrency.toUpperCase()} ${calculatedShipping}`)
        .replace(/{{total}}/g, `${safeCurrency.toUpperCase()} ${finalTotal}`);

      await sendEmail(user.email, `Order Confirmed - ${orderNo}`, htmlContent);
    } catch (mailErr) {
      // Don't fail the order if the email fails — just log it
      console.error('Order confirmation email failed:', mailErr.message);
    }
 
    // ── Notification ──────────────────────────────────────────
    await Notifications.create({
      opened:  false,
      type:    'order',
      title:   `${user.firstName} ${user.lastName} placed an order from ${user.city}.`,
      orderId: order._id,
      userId:  existingUser?._id || null,
      meta:    { paymentMethod, city: user.city, orderNo }
    });
 
    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      orderId: order._id,
      orderNo
    });
 
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/* ─── Get Order by ID (customer view) ─────────────────────── */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Orders.findById(id).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Fetch all order items for this order
    const items = await OrderItem.find({ orderId: id })
      .select("-__v")   // keep vendorId for internal use, but strip in vendor API
      .lean();

    const courierInfo = await CourierInfo.find({ orderId: id });

    return res.status(200).json({
      success: true,
      data: { ...order, items },
      courierInfo,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/* ─── Get Orders for Vendor dashboard ─────────────────────── */
const getVendorOrders = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { vendorId };
    if (status) filter.vendorStatus = status;

    const items = await OrderItem.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // ✅ Attach only shipping city/pincode — NOT name/phone/email
    const orderIds = [...new Set(items.map((i) => i.orderId.toString()))];
    const orders   = await Orders.find({ _id: { $in: orderIds } })
      .select("orderNo status createdAt user.city user.zip user.state")  // 🔒 masked
      .lean();

    const orderMap = Object.fromEntries(orders.map((o) => [o._id.toString(), o]));

    const result = items.map((item) => ({
      ...item,
      orderInfo: orderMap[item.orderId.toString()] || null,
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/* ─── Vendor updates item status ───────────────────────────── */
const updateVendorItemStatus = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { vendorStatus, courierName, trackingId, trackingLink } = req.body;

    const update = { vendorStatus };
    if (courierName)  update.courierName  = courierName;
    if (trackingId)   update.trackingId   = trackingId;
    if (trackingLink) update.trackingLink = trackingLink;
    if (vendorStatus === "shipped")   update.shippedAt   = new Date();
    if (vendorStatus === "delivered") update.deliveredAt = new Date();

    const updated = await OrderItem.findByIdAndUpdate(itemId, update, { new: true });

    // Auto-update parent order status if all items delivered
    const allItems    = await OrderItem.find({ orderId: updated.orderId });
    const allDelivered = allItems.every((i) => i.vendorStatus === "delivered");
    const anyShipped   = allItems.some((i) =>
      ["shipped", "delivered"].includes(i.vendorStatus)
    );

    let orderStatus = "processing";
    if (allDelivered)  orderStatus = "delivered";
    else if (anyShipped) orderStatus = "partial_shipped";

    await Orders.findByIdAndUpdate(updated.orderId, { status: orderStatus });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getVendorOrders,
  updateVendorItemStatus,
};