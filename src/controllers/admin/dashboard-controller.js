const Order = require("../../models/Order");
const User = require("../../models/User");
const Product = require("../../models/Product");
const Notifications = require("../../models/Notification");

const calculateExpirationDate = (days) => {
  const now = new Date();
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
};
/*  Get Dashboard Analytics by Admin */
const getDashboardAnalyticsByAdmin = async (req, res) => {
  try {
    const commissionRate = process.env.COMMISSION / 100;
    const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
    const getLastWeeksDate = () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    };

    const getOrdersReport = (ordersByYears) =>
      [...new Array(12)].map(
        (_, i) =>
          ordersByYears?.filter(
            (v) => new Date(v.createdAt).getMonth() + 1 === i + 1
          ).length
      );

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

    const totalUsers = await User.countDocuments({
      role: "user",
    }).select("createdAt");
    const totalVendors = await User.countDocuments({
      role: "vendor",
    });

    const totalPendingOrders = await Order.countDocuments({
      status: "pending",
    });

    const totalProducts = await Product.countDocuments();
    const lastYearDate = calculateExpirationDate(-365).getTime();
    const todayDate = new Date().getTime();
    const ordersByYears = await Order.find({
      createdAt: { $gt: lastYearDate, $lt: todayDate },
    }).select(["createdAt", "status", "total"]);
    const todaysOrders = ordersByYears.filter(
      (v) =>
        new Date(v.createdAt).toLocaleDateString() ===
        new Date().toLocaleDateString()
    );
    // Fetching best-selling products
    const bestSellingProducts = await Product.find()
      .sort({ sold: -1 })
      .limit(5);

    const data = {
      salesReport: getOrdersReport(ordersByYears),
      bestSellingProducts: bestSellingProducts,
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
        week: getIncomeReport("week", ordersByYears),
        month: getIncomeReport("month", ordersByYears),
        year: getIncomeReport("year", ordersByYears),
      },
      commissionReport: {
        week: getIncomeReport("week", ordersByYears).map((value) => {
          if (value !== 0) {
            return value - (value - value * commissionRate); // Calculate 20%
          } else {
            return value; // Keep zeros as zeros
          }
        }),
        month: getIncomeReport("month", ordersByYears).map((value) => {
          if (value !== 0) {
            return value - (value - value * commissionRate); // Calculate 20%
          } else {
            return value; // Keep zeros as zeros
          }
        }),
        year: getIncomeReport("year", ordersByYears).map((value) => {
          if (value !== 0) {
            return value - (value - value * commissionRate); // Calculate 20%
          } else {
            return value; // Keep zeros as zeros
          }
        }),
      },
      totalUsers,
      totalVendors,
      totalPendingOrders,
      totalProducts,
      dailyOrders: todaysOrders.length,
      dailyEarning: todaysOrders
        .filter(
          (order) => order.status !== "cancelled" && order.status !== "returned"
        )
        .reduce((partialSum, order) => partialSum + Number(order.total), 0),
    };
    res.status(200).json({ success: true, data: data });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
/*  Get Low Stock Products by Admin */
const getAdminLowStockProductsByAdmin = async (req, res) => {
  try {
    const { page: pageQuery, limit: limitQuery } = req.query;

    const limit = parseInt(limitQuery) || 10;
    const page = parseInt(pageQuery) || 1;

    const skip = limit * (page - 1);

    const totalProducts = await Product.countDocuments({
      stockQuantity: { $lt: 30 },
    });

    const products = await Product.aggregate([
      {
        $match: {
          stockQuantity: { $lt: 30 },
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
// /*  Get Notifications (Admin) */
const getNotificationsByAdmin = async (req, res) => {
  try {
    const { page: pageQuery, limit: limitQuery } = req.query;

    const limit = parseInt(limitQuery) || 10;
    const page = parseInt(pageQuery) || 1;
    const skip = limit * (page - 1);

    const totalNotifications = await Notifications.countDocuments();

    const totalUnreadNotifications = await Notifications.countDocuments({
      opened: false,
    });

    const notifications = await Notifications.find({}, null, {
      limit: limit,
      skip: skip,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notifications,
      totalNotifications: totalNotifications,
      totalUnread: totalUnreadNotifications,
      count: Math.ceil(totalUnreadNotifications / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getDashboardAnalyticsByAdmin,
  getAdminLowStockProductsByAdmin,
  getNotificationsByAdmin,
};
