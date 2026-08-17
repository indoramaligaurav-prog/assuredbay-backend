const Orders = require("../../models/Order");
const OrderItem = require('../../models/OrderItem');
const Shop = require("../../models/Shop");
const CourierInfo = require("../../models/CourierInfo");

// Map sidebar tab key -> real vendorStatus values on OrderItem
const STATUS_TAB_MAP = {
  pending:   ['pending'],
  approved:  ['approved'],
  shipped:   ['shipped'],
  delivered: ['delivered'],
  all:       ['pending', 'approved', 'shipped', 'delivered'], // happy-path only, cancel/return excluded for now
};

const getOrdersByVendor = async (req, res) => {
  try {
    const {
      limit    = 10,
      page     = 1,
      search   = '',
      searchBy = 'buyer',   // 'buyer' | 'order' | 'item'
      status   = 'pending', // sidebar tab key
    } = req.query;
    const vendorId = req.vendor._id;

    const parsedLimit = parseInt(limit);
    const parsedPage  = parseInt(page);
    const skip        = parsedLimit * (parsedPage - 1);

    const vendorStatuses = STATUS_TAB_MAP[status] || STATUS_TAB_MAP.pending;

    // ── Step 1: find all OrderItems belonging to this vendor, filtered by status tab ──
    const itemFilter = { vendorId, vendorStatus: { $in: vendorStatuses } };

    // 'item' search applies directly on OrderItem (productName)
    if (search && searchBy === 'item') {
      itemFilter.productName = { $regex: search, $options: 'i' };
    }

    const vendorItems = await OrderItem.find(itemFilter).lean();
    if (!vendorItems.length) {
      return res.status(200).json({ success: true, data: [], total: 0, totalPages: 0, currentPage: parsedPage });
    }

    // ── Step 2: get unique orderIds from those items ──
    const orderIds = [...new Set(vendorItems.map(i => i.orderId.toString()))];

    // ── Step 3: fetch matching orders with optional search ──
    const searchFilter = (search && searchBy !== 'item')
      ? searchBy === 'order'
        ? { orderNo: { $regex: search, $options: 'i' } }
        : {
            $or: [
              { 'user.firstName': { $regex: search, $options: 'i' } },
              { 'user.lastName':  { $regex: search, $options: 'i' } },
            ],
          }
      : {};

    const [ orders, total ] = await Promise.all([
      Orders.find({ _id: { $in: orderIds }, ...searchFilter })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Orders.countDocuments({ _id: { $in: orderIds }, ...searchFilter }),
    ]);

    // ── Step 4: attach ONLY this vendor's items to each order ──
    // Strip sensitive customer fields — vendor never sees email/phone
    const safeOrders = orders.map(order => {
      const items = vendorItems.filter(i => i.orderId.toString() === order._id.toString());
      return {
        ...order,
        items,
        user: {
          // Safe fields only
          firstName: order.user?.firstName,
          lastName:  order.user?.lastName,
          city:      order.user?.city,
          state:     order.user?.state,
          country:   order.user?.country,
          zip:       order.user?.zip,
          // email, phone, address intentionally excluded
        },
      };
    });

    return res.status(200).json({
      success:     true,
      data:        safeOrders,
      total,
      totalPages:  Math.ceil(total / parsedLimit),
      currentPage: parsedPage,
    });

  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*  Update Order by ID (Vendor) */
const updateOrderByVendor = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const order = await Orders.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order Updated",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
const getOrderByVendor = async (req, res) => {
  try {
    if (!req.vendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const vendorId = req.vendor._id.toString();
    const id = req.params.id;

    const order = await Orders.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order Not Found",
      });
    }

    // ✅ FILTER USING vendorid (NEW STRUCTURE)
    const vendorItems = order.items.filter((item) => {
      return item.vendorid?.toString() === vendorId;
    });

    if (!vendorItems.length) {
      return res.status(403).json({
        success: false,
        message: "You have no products in this order",
      });
    }

    // Optional: Recalculate totals for vendor
    const vendorSubTotal = vendorItems.reduce(
      (sum, item) => sum + (item.subtotal || 0),
      0
    );

    const vendorShipping = vendorItems.reduce(
      (sum, item) => sum + (item.shipping || 0),
      0
    );

    const vendorTotal = vendorSubTotal + vendorShipping;

    return res.status(200).json({
      success: true,
      data: {
        ...order.toObject(),
        items: vendorItems,
        subTotal: vendorSubTotal,
        shipping: vendorShipping,
        total: vendorTotal,
        totalItems: vendorItems.length
      }
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// PATCH /vendor/orders/item/:id/decision
// body: { decision: 'approved' | 'rejected', rejectReason?: string }
const updateOrderItemDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, rejectReason } = req.body;
    const vendorId = req.vendor._id;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Invalid decision value' });
    }

    if (decision === 'rejected' && !rejectReason?.trim()) {
      return res.status(400).json({ success: false, message: 'A reason is required to reject an item' });
    }

    // Scope to this vendor — a vendor can only decide on their own items
    const item = await OrderItem.findOne({ _id: id, vendorId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Order item not found' });
    }

    if (item.vendorStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This item is already "${item.vendorStatus}" and can no longer be approved or rejected.`,
      });
    }

    item.vendorStatus = decision;
    if (decision === 'rejected') {
      item.rejectReason = rejectReason.trim();
    }
    await item.save();

    return res.status(200).json({
      success: true,
      message: decision === 'approved' ? 'Order item approved' : 'Order item rejected',
      data: item,
    });

  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOrdersByVendor,
  updateOrderByVendor,
  getOrderByVendor,
  updateOrderItemDecision
};
