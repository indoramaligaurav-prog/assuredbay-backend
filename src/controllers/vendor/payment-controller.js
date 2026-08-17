const Payment = require("../../models/Payment");
const Shop = require("../../models/Shop");
const Orders = require("../../models/Order");
/*    Get Orders from Last Month for a Shop (Admin)    */
const lastMonthOrdersByAdmin = async (shopId) => {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const pipeline = [
    {
      $match: {
        "items.shop": shopId,
        status: "delivered",
        createdAt: {
          $gte: lastMonth,
          $lt: firstDayThisMonth,
        },
      },
    },
    {
      $project: {
        month: { $month: "$createdAt" },
        year: { $year: "$createdAt" },
        income: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$items",
                  as: "item",
                  cond: { $eq: ["$$item.shop", shopId] },
                },
              },
              as: "item",
              in: { $multiply: ["$$item.quantity", "$$item.price"] },
            },
          },
        },
        orderId: "$_id",
      },
    },
    {
      $group: {
        _id: {
          month: "$month",
          year: "$year",
        },
        orders: { $push: "$$ROOT" },
        totalIncome: { $sum: "$income" },
      },
    },
  ];

  const result = await Orders.aggregate(pipeline);

  const lastMonthTotal = result[0] || null;
  return lastMonthTotal;
};

/*     Get Orders from This Month for a Shop (Admin)    */
const thisMonthOrdersByAdmin = async (shopId) => {
  const today = new Date();
  const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const tomorrow = new Date(today.getFullYear(), today.getMonth() + 1, 1); // Start of next month
  const pipeline = [
    {
      $match: {
        "items.shop": shopId,
        status: "delivered",
        createdAt: {
          $gte: firstDayThisMonth,
          $lt: tomorrow,
        },
      },
    },
    {
      $project: {
        // Existing projection fields (if any)
        month: { $month: "$createdAt" },
        year: { $year: "$createdAt" },
        income: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$items",
                  as: "item",
                  cond: { $eq: ["$$item.shop", shopId] },
                },
              },
              as: "item",
              in: { $multiply: ["$$item.quantity", "$$item.price"] }, // Calculate income per item
            },
          },
        },
        orderId: "$_id",
      },
    },
    {
      $group: {
        _id: {
          month: "$month",
          year: "$year",
        },
        orders: { $push: "$$ROOT" },
        totalIncome: { $sum: "$income" },
      },
    },
  ];
  const result = await Orders.aggregate(pipeline);
  const thisMonthTotal = result[0] || null;
  return thisMonthTotal;
};
/*    Get Payments by Vendor (Vendor Protected)    */
const getPaymentsByVendor = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const Shop = require('../../models/Shop');
    const OrderItem = require('../../models/OrderItem');

    const shop = await Shop.findOne({ vendor: vendorId }).lean();

    // ── Pending payout: accepted but not yet delivered/released ──
    const pendingItems = await OrderItem.find({
      vendorId,
      vendorStatus: { $nin: ['pending', 'rejected', 'cancelled'] },
      payoutStatus: { $ne: 'released' },
    }).lean();

    const User = require('../../models/User');
    const vendorUser = await User.findById(vendorId).lean();
    const commissionPercent = vendorUser?.commission || 0;
    const pendingAmount = pendingItems.reduce((sum, item) => {
      const commission = (item.subtotal * commissionPercent) / 100;
      return sum + (item.subtotal - commission);
    }, 0);

    // ── Released + failed payouts (for history table) ──
    const historyItems = await OrderItem.find({
      vendorId,
      payoutStatus: { $in: ['released', 'failed'] },
    })
      .sort({ updatedAt: -1 })
      .lean();

    const releasedAmount = historyItems
      .filter((i) => i.payoutStatus === 'released')
      .reduce((sum, i) => sum + (i.payoutAmount || 0), 0);

    const failedCount = historyItems.filter((i) => i.payoutStatus === 'failed').length;

    return res.status(200).json({
      success: true,
      data: {
        payoutsEnabled: shop?.payoutsEnabled || false,
        summary: {
          pendingAmount,
          releasedAmount,
          failedCount,
        },
        history: historyItems.map((item) => ({
          _id: item._id,
          orderNo: item.orderNo,
          productName: item.productName,
          subtotal: item.subtotal,
          commissionPercent,
          payoutAmount: item.payoutAmount,
          payoutStatus: item.payoutStatus,
          payoutError: item.payoutError || null,
          updatedAt: item.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error('getPaymentsByVendor error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};
/*     Get Total Income by Vendor (Vendor Protected)    */
const getIncomeByVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      vendor: req.vendor._id,
    });
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }
    const { limit = 10, page = 1 } = req.query;

    const skip = parseInt(limit) * (parseInt(page) - 1) || 0;

    function getTotalAfterComission(param) {
      const commissionRate = process.env.COMMISSION / 100;
      const finalPaymentAfterComission = param * (1 - commissionRate);
      return finalPaymentAfterComission;
    }
    function getComission(param) {
      const commissionRate = process.env.COMMISSION / 100;
      const finalPaymentAfterComission = param * (1 - commissionRate);

      const totalComission = param - finalPaymentAfterComission;
      return totalComission;
    }

    const count = await Payment.countDocuments({
      shop: shop._id,
    });

    const allPayments = await Payment.find({
      shop: shop._id,
    })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: 1 });

    const lastMonthTotal = await lastMonthOrdersByAdmin(shop._id);
    const thisMonthTotal = await thisMonthOrdersByAdmin(shop._id);
    const today = new Date();

    const lastMonthDate = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );

    const month = today.getMonth(); // Months are zero-indexed (January = 0)
    const year = today.getFullYear();

    // Calculate last month's dates
    const lastMonth = month === 0 ? 11 : month - 1; // Handle January as December of previous year
    const lastYear = month === 0 ? year - 1 : year;

    // Define the start and end dates for the last month
    const startDate = new Date(lastYear, lastMonth, 1);
    const endDate = new Date(lastYear, lastMonth + 1, 0); // Go to the last day of the last month (day 0)
    const lastMonthPaymentDate = await Payment.findOne({
      shop: shop._id,
      date: {
        $gte: startDate, // Greater than or equal to start of the month
        $lt: endDate, // Less than the end of the month (next month's 1st day)
      },
    }).select("createdAt");
    const lastMonthPayment = {
      date: new Date(
        `${lastMonthTotal?._id?.year || lastMonthDate.getFullYear()} ${
          lastMonthTotal?._id?.month || lastMonthDate.getMonth() + 1
        }`
      ), // Use timestamp for accurate date
      orders: lastMonthTotal?.orders.map((v) => v._id),
      shop: shop._id,
      total: lastMonthTotal?.totalIncome || 0,
      totalIncome: Number(
        getTotalAfterComission(lastMonthTotal?.totalIncome || 0)?.toFixed(1)
      ),
      totalCommission: Number(
        getComission(lastMonthTotal?.totalIncome || 0)?.toFixed(1)
      ),
      status: "pending",
    };

    const thisMonthPayment = {
      date: new Date(
        `${thisMonthTotal?._id?.year || new Date().getFullYear()} ${
          thisMonthTotal?._id?.month || new Date().getMonth() + 1
        }`
      ), // Use timestamp for accurate date
      orders: thisMonthTotal?.orders.map((v) => v._id),
      shop: shop._id,
      total: thisMonthTotal?.totalIncome,
      totalIncome: Number(
        getTotalAfterComission(thisMonthTotal?.totalIncome)?.toFixed(1)
      ),
      totalCommission: Number(
        getComission(thisMonthTotal?.totalIncome)?.toFixed(1)
      ),
      status: "pending",
      thisMonth: true,
    };

    return res.status(200).json({
      success: true,
      data: [
        thisMonthPayment,
        !lastMonthPaymentDate && { ...lastMonthPayment },
        ...allPayments,
      ].filter((v) => Boolean(v)),
      total: count,
      count: Math.ceil(count / parseInt(limit)),
      currentPage: page,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*     Get Payment Details by ID for Vendor    */
const getPaymentDetailsByIdByVendor = async (req, res) => {
  try {
    const { pid } = req.params;
    const { page = 1, limit = 10 } = req.query; // Set default values for page and limit

    const payment = await Payment.findOne({
      _id: pid,
    })
      .populate({
        path: "shop",
        select: [
          "name",
          "cover",
          "logo",
          "approved",
          "approvedAt",
          "description",
          "status",
          "phone",
          "address",
        ],
      })
      .populate({
        path: "orders",
        select: [
          "items",
          "createdAt",
          "total",
          "status",
          "paymentMethod",
          "user",
        ],
      });

    const orders = payment.orders || [];

    const totalOrders = orders.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = Math.min(start + parseInt(limit), totalOrders);
    const paginatedOrders = orders.slice(start, end);
    const { totalCommission, totalIncome, status, paidAt, date } = payment;
    res.status(200).json({
      success: true,
      payment: {
        totalCommission,
        totalIncome,
        status,
        paidAt,
        date,
      },
      shop: payment.shop,
      data: {
        data: paginatedOrders,
        total: totalOrders,
        count: Math.ceil(totalOrders / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
module.exports = {
  getPaymentsByVendor,
  getIncomeByVendor,
  getPaymentDetailsByIdByVendor,
};
