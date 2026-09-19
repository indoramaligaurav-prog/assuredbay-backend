const OrderItem  = require('../../models/OrderItem');
const Orders = require("../../models/Order");
const Product    = require('../../models/Product');
const User = require('../../models/User');
const { createShipment, schedulePickup } = require('../../services/fedex.service');
const path = require('path');
const fs   = require('fs');
const Country = require('../../models/Countries');

const FALLBACK_SHIPPER_PHONE = '9999999999'; // TODO: replace with real business support number

// Minimal country name -> ISO code map for the countries you actually operate in.
// Extend this as you onboard vendors/customers from new countries.
const COUNTRY_CODE_MAP = {
  'India': 'IN',
  'Italy': 'IT',
  'United States': 'US',
  'USA': 'US',
};

async function getCountryCode(countryName) {
  if (!countryName) return 'IN';

  const country = await Country.findOne({
    $or: [
      { code: countryName.trim().toUpperCase() },
      { label: countryName.trim() }
    ]
  }).lean();

  return country?.code || 'IN';
}

// ── POST /api/shipments/create ──
const createShipmentHandler = async (req, res) => {
  try {
    const { orderItemId } = req.body;
    const vendorId = req.user._id; // from auth middleware

    const item = await OrderItem.findById(orderItemId).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Order item not found' });

    // Vendor can only ship their own items
    if (item.vendorId.toString() !== vendorId.toString())
      return res.status(403).json({ success: false, message: 'Unauthorized' });

    if (item.vendorStatus === 'shipped' || item.trackingNumber)
      return res.status(400).json({ success: false, message: 'Shipment already created' });

    // ── Fetch order (has customer address) — never returned to vendor ──
    const order = await Orders.findById(item.orderId).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // ── Fetch product for sender address (itemLocation) + customs data ──
    const product = await Product.findById(item.productId).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // ── Fetch vendor profile for real shipper name/phone ──
    const vendorUser = await User.findById(vendorId).lean();

    const loc = product.itemLocation || {};

    console.log('locatiopn check' , loc);

    if (!loc.streetAddress || !loc.city || !loc.country || !loc.state) {
      return res.status(400).json({
        success: false,
        message: 'This product is missing a complete shipping address (street, city, state, country). Please update the product before creating a shipment.',
      });
    }

    const sender = {
      name:        `${vendorUser?.firstName || ''} ${vendorUser?.lastName || ''}`.trim() || 'Vendor',
      phone:       (vendorUser?.phone && vendorUser.phone !== 'N/A') ? vendorUser.phone : FALLBACK_SHIPPER_PHONE,
      address:     loc.streetAddress,
      city:        loc.city,
      state:       loc.state,
      zipcode:     loc.zipcode || '',
      countryCode: await getCountryCode(loc.country),
    };

    // ── Recipient — internal only, NEVER sent to vendor ──
    // shippingAddress is currently always null in real orders, but check it first in case it's set later
    const shipTo = order.shippingAddress || order.user;

    const recipient = {
      name:        `${shipTo?.firstName || order.user?.firstName || ''} ${shipTo?.lastName || order.user?.lastName || ''}`.trim(),
      phone:       shipTo?.phone || order.user?.phone || '',
      address:     shipTo?.address || order.user?.address || '',
      city:        shipTo?.city || order.user?.city || '',
      state:       shipTo?.state || order.user?.state || '',
      zip:         shipTo?.zip || order.user?.zip || '',
      countryCode: await getCountryCode(
        shipTo?.country || order.user?.country
      ),
    };

    const parcel = {
      weight: product.additionalDetails?.packageWeight || 0.5,
      length: product.additionalDetails?.packageLength || 10,
      width:  product.additionalDetails?.packageWidth  || 10,
      height: product.additionalDetails?.packageHeight || 10,
    };

    const commodity = {
      name:                 product.title,
      description:          product.title,
      harmonizedCode:       product.additionalDetails?.hscode || '',
      countryOfManufacture: await getCountryCode(product.additionalDetails?.countryOfManufacture || loc.country),
      quantity:             item.quantity || 1,
      weightKg:             product.additionalDetails?.packageWeight || 0.5,
      customsValueUsd:      item.unitPrice || 0, // fixed-currency customs value, per business decision — see note in fedex.service.js
    };

    const { trackingNumber, shipmentId, labelUrl } = await createShipment({
      sender, recipient, parcel, commodity, orderItemId, orderNo: item.orderNo
    });

    // ── Save to OrderItem ──
    await OrderItem.findByIdAndUpdate(orderItemId, {
      trackingNumber,
      shipmentId,
      labelUrl,
      shippingService: 'FedEx Ground',
    });

    return res.status(200).json({
      success: true,
      data: { trackingNumber, labelUrl }, // labelUrl for download only, no customer data
    });

  } catch (err) {
    console.error('FedEx shipment error:', err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: err?.response?.data?.errors?.[0]?.message || err.message });
  }
};

// ── GET /api/shipments/label/:orderItemId ──
const downloadLabel = async (req, res) => {
  try {
    const { orderItemId } = req.params;
    const vendorId = req.user._id;

    const item = await OrderItem.findById(orderItemId).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    if (item.vendorId.toString() !== vendorId.toString())
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    if (!item.labelUrl) return res.status(404).json({ success: false, message: 'Label not generated yet' });

    const filePath = path.join(__dirname, '../../', item.labelUrl);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ success: false, message: 'Label file not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="label-${item.orderNo}.pdf"`);
    fs.createReadStream(filePath).pipe(res);

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/shipments/pickup ──
const schedulePickupHandler = async (req, res) => {
  try {
    const { orderItemId, pickupDate, readyTime, closeTime } = req.body;
    const vendorId = req.user._id;

    if (!pickupDate || !readyTime || !closeTime) {
      return res.status(400).json({ success: false, message: 'Pickup date, ready time, and close time are required' });
    }

    const item = await OrderItem.findById(orderItemId);
    if (!item) return res.status(404).json({ success: false, message: 'Order item not found' });

    if (item.vendorId.toString() !== vendorId.toString())
      return res.status(403).json({ success: false, message: 'Unauthorized' });

    // Pickup only makes sense once a shipment/label already exists
    if (!item.trackingNumber) {
      return res.status(400).json({ success: false, message: 'Create a shipment before scheduling a pickup' });
    }

    if (item.pickupConfirmationNumber) {
      return res.status(400).json({ success: false, message: 'Pickup already scheduled for this item' });
    }

    // ── Fetch product for sender address (same as createShipmentHandler) ──
    const product = await Product.findById(item.productId).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const vendorUser = await User.findById(vendorId).lean();
    const loc = product.itemLocation || {};

    const sender = {
      name:        `${vendorUser?.firstName || ''} ${vendorUser?.lastName || ''}`.trim() || 'Vendor',
      phone:       (vendorUser?.phone && vendorUser.phone !== 'N/A') ? vendorUser.phone : FALLBACK_SHIPPER_PHONE,
      address:     loc.streetAddress || '',
      city:        loc.city || '',
      state:       loc.state || '',
      zipcode:     loc.zipcode || '',
      countryCode: getCountryCode(loc.country),
    };

    const { pickupConfirmationNumber, raw } = await schedulePickup({
      sender,
      pickupDate,   // 'YYYY-MM-DD'
      readyTime,    // 'HH:mm:ss'
      closeTime,    // 'HH:mm:ss'
      packageCount: 1,
      totalWeightKg: product.additionalDetails?.packageWeight || 0.5,
    });

    if (!pickupConfirmationNumber) {
      console.error('FedEx pickup response (no confirmation number found):', JSON.stringify(raw));
      return res.status(502).json({ success: false, message: 'FedEx did not return a confirmation number' });
    }

    await OrderItem.findByIdAndUpdate(orderItemId, {
      pickupConfirmationNumber,
      pickupDate:      new Date(pickupDate),
      pickupReadyTime: readyTime,
      pickupCloseTime: closeTime,
    });

    return res.status(200).json({
      success: true,
      data: { pickupConfirmationNumber },
    });

  } catch (err) {
    console.error('FedEx pickup error:', err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: err?.response?.data?.errors?.[0]?.message || err.message });
  }
};


module.exports = { createShipmentHandler, downloadLabel ,schedulePickupHandler };