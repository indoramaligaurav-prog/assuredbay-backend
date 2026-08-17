const Order = require("../../models/Order");
const Product = require("../../models/Product");

const moment = require("moment");
const Shop = require("../../models/Shop");

const calculateExpirationDate = (days) => {
  const now = new Date();
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
};

/*  Get Vendor Analytics */
const getVendorAnalytics = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      vendor: req.vendor._id.toString(),
    });
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }

    const totalProducts = await Product.countDocuments({
      shop: shop._id,
    });

    const bestSellingProducts = await Product.find({
      shop: shop._id,
    })
      .sort({ sold: -1 })
      .limit(5);

    const startOfDay = moment().startOf("day");
    const endOfDay = moment().endOf("day");
    const startOfMonth = moment().startOf("month");
    const endOfMonth = moment().endOf("month");

    const getOrderStats = async (prop) => {
      const data = await Order.aggregate([
        // Match orders within the provided date range
        {
          $match: {
            createdAt: {
              $gte:
                prop === "month" ? startOfMonth.toDate() : startOfDay.toDate(),
              $lte: prop === "month" ? endOfMonth.toDate() : endOfDay.toDate(),
            },
          },
        },
        // Unwind the items array to get individual items
        { $unwind: "$items" },
        {
          $match: {
            "items.shop": shop._id,
          },
        },
        // Group by vendorId and calculate total earnings for each vendor
        {
          $group: {
            _id: 1,
            totalEarnings: { $sum: "$items.total" },
            totalOrders: { $sum: 1 },
          },
        },
      ]);
      return data;
    };
    const dailyStats = await getOrderStats("day");
    const monthlyStats = await getOrderStats("month");
    // Format the result as an object with vendorId as keys and earnings as values
    let dailyEarningsByVendor = 0;
    let totalOrders = 0;
    let monthlyEarningsByVendor = 0;

    dailyStats.forEach((order) => {
      dailyEarningsByVendor = order.totalEarnings;
      totalOrders += order.totalOrders; // Accumulate the total number of orders
    });
    monthlyStats.forEach((order) => {
      monthlyEarningsByVendor = order.totalEarnings;
    });

    // Get the current year
    const currentYear = new Date().getFullYear();

    // Initialize the sales report array with zeros for each month
    let salesReport = Array(12).fill(0);

    // Loop through each month and aggregate orders
    for (let month = 0; month < 12; month++) {
      // Get the start and end date for the current month
      const startDate = moment([currentYear, month, 1])
        .startOf("month")
        .toDate();
      const endDate = moment([currentYear, month, 1]).endOf("month").toDate();

      // Aggregate orders for the current month
      const orders = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        // Unwind the items array to get individual items
        { $unwind: "$items" },
        {
          $match: {
            "items.shop": shop._id,
          },
        },
        // Group by vendorId and calculate total earnings for each vendor
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
          },
        },
      ]);

      // If there are orders for the current month, update the sales report
      if (orders.length > 0) {
        salesReport[month] = orders[0].totalOrders;
      }
    }

    // income report
    // Initialize income report arrays for week, month, and year
    const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
    const getLastWeeksDate = () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    };

    const getIncomeReport = (prop, ordersByYears) => {
      const newData = ordersByYears.filter((item) =>
        prop === "year"
          ? true
          : prop === "week"
          ? new Date(item.createdAt).getMonth() === new Date().getMonth() &&
            new Date(item.createdAt).getTime() > getLastWeeksDate().getTime()
          : new Date(item.createdAt).getMonth() === new Date().getMonth()
      );

      return [
        ...new Array(
          prop === "week"
            ? 7
            : prop === "year"
            ? 12
            : getDaysInMonth(
                new Date().getMonth() + 1,
                new Date().getFullYear()
              )
        ),
      ].map((_, i) =>
        prop === "week"
          ? newData
              ?.filter(
                (v) =>
                  new Date(v.createdAt).getDate() ===
                    getLastWeeksDate().getDate() + 1 + i &&
                  v.status !== "cancelled" &&
                  v.status !== "returned"
              )
              .reduce((partialSum, a) => partialSum + Number(a.total), 0)
          : prop === "year"
          ? newData
              ?.filter(
                (v) =>
                  new Date(v.createdAt).getMonth() === i &&
                  v.status !== "cancelled" &&
                  v.status !== "returned"
              )
              .reduce((partialSum, a) => partialSum + Number(a.total), 0)
          : newData
              ?.filter(
                (v) =>
                  new Date(v.createdAt).getDate() === i + 1 &&
                  v.status !== "cancelled" &&
                  v.status !== "returned"
              )
              .reduce((partialSum, a) => partialSum + Number(a.total), 0)
      );
    };

    const lastYearDate = calculateExpirationDate(-365).getTime();
    const todayDate = new Date().getTime();
    const ordersByYears = await Order.find({
      "items.shop": shop._id,
      createdAt: { $gt: lastYearDate, $lt: todayDate },
    }).select(["createdAt", "status", "total"]);
    const totalPendingOrders = await Order.countDocuments({
      "items.shop": shop._id,
      status: "pending",
    });
    const commissionRate = process.env.COMMISSION / 100;
    res.status(200).json({
      success: true,
      data: {
        bestSellingProducts,
        dailyEarning: dailyEarningsByVendor,
        dailyOrders: totalOrders,
        totalProducts,
        totalPendingOrders,
        salesReport,

        ordersReport: [
          "pending",
          "ontheway",
          "delivered",
          "returned",
          "cancelled",
        ].map(
          (status) => ordersByYears.filter((v) => v.status === status).length
        ),
        incomeReport: {
          week: getIncomeReport("week", ordersByYears).map((value) => {
            if (value !== 0) {
              return value - value * commissionRate; // Calculate 20%
            } else {
              return value; // Keep zeros as zeros
            }
          }),
          month: getIncomeReport("month", ordersByYears).map((value) => {
            if (value !== 0) {
              return value - value * commissionRate; // Calculate 20%
            } else {
              return value; // Keep zeros as zeros
            }
          }),
          year: getIncomeReport("year", ordersByYears).map((value) => {
            if (value !== 0) {
              return value - value * commissionRate; // Calculate 20%
            } else {
              return value; // Keep zeros as zeros
            }
          }),
        },
        monthlyEarningsByVendor,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*  Get Vendor Low Stock Products */
const getVendorLowStockProducts = async (req, res) => {
  try {
    const { page: pageQuery, limit: limitQuery } = req.query;
    const limit = parseInt(limitQuery) || 10;
    const page = parseInt(pageQuery) || 1;
    const skip = limit * (page - 1);
    const shop = await Shop.findOne({
      vendor: req.vendor._id.toString(),
    });
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }

    const totalProducts = await Product.countDocuments({
      stockQuantity: { $lt: 30 },
      shop: shop._id,
    });

    const products = await Product.aggregate([
      {
        $match: {
          stockQuantity: { $lt: 30 },
          shop: shop._id,
        },
      },

      {
        $sort: {
          stockQuantity: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "reviews",
          localField: "reviews",
          foreignField: "_id",
          as: "reviews",
        },
      },
      {
        $addFields: {
          averageRating: { $avg: "$reviews.rating" },
          image: { $arrayElemAt: ["$images", 0] },
        },
      },

      {
        $project: {
          image: { url: "$image.url" },
          name: 1,
          slug: 1,
          discount: 1,
          likes: 1,
          salePrice: 1,
          price: 1,
          averageRating: 1,
          vendor: 1,
          shop: 1,
          stockQuantity: 1,
          createdAt: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: products,
      total: totalProducts,
      count: Math.ceil(totalProducts / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
module.exports = {
  getVendorAnalytics,
  getVendorLowStockProducts,
};
