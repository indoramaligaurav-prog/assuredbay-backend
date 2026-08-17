const Shop = require("../../models/Shop");
const User = require("../../models/User");
const Product = require("../../models/Product");
const Orders = require("../../models/Order");
const Payment = require("../../models/Payment");
const Review = require("../../models/Review");
const Notifications = require("../../models/Notification");
const { singleFilesDelete } = require("../../utils/uploader-util");

const { sendEmail } = require("../../utils/mailer-util");

async function getTotalEarningsByShopId(shopId) {
  const pipeline = [
    {
      $match: {
        shop: shopId,
        status: "paid",
      },
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: "$totalIncome" },
        totalCommission: { $sum: "$totalCommission" },
      },
    },
  ];

  const result = await Payment.aggregate(pipeline);

  if (result.length > 0) {
    return result[0];
  } else {
    return {
      totalEarnings: 0,
      totalCommission: 0,
    };
  }
}
async function calculateShopRating(shopId) {
  const products = await Product.find({ shop: shopId }).select("_id");
  const productIds = products.map((p) => p._id);

  const result = await Review.aggregate([
    { $match: { product: { $in: productIds } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    rating: result.length > 0 ? result[0].avgRating : 0,
    ratingCount: result.length > 0 ? result[0].count : 0,
  };
}
const getAllShopsByAdmin = async (req, res) => {
  try {

    const shops = await Shop.find({}).select(["name", "slug", "_id"]);
    return res.status(200).json({
      success: true,
      data: shops,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*     Get All Shops (Admin)    */
const getShopsByAdmin = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "", status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {
      name: { $regex: search, $options: "i" },
    };

   if (status) {
  query.status = status.replace(/-/g, ' '); // 'in-review' -> 'in review'
}

    const totalShop = await Shop.countDocuments(query);

    const shops = await Shop.find(query, null, {
      skip: skip,
      limit: parseInt(limit),
    })
      .select([
        "vendor",
        "logo",
        "slug",
        "status",
        "products",
        "name",
        "approvedAt",
        "approved",
      ])
      .populate({
        path: "vendor",
        select: ["firstName", "lastName", "cover"],
      })

      .sort({
        createdAt: -1,
      })
       .lean();

    for (let shop of shops) {
      const { rating, ratingCount } = await calculateShopRating(shop._id);
      shop.rating = rating;
      shop.ratingCount = ratingCount;

      const productCount = await Product.countDocuments({ vendor: shop.vendor._id });
      shop.productCount = productCount;

    }

    
    return res.status(200).json({
      success: true,
      data: shops,
      pagination: {
        total: totalShop,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalShop / limit) || 1,
      },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*     Get One Shop by ID (Admin)    */
const getOneShopByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const shop = await Shop.findOne({ slug: slug })
      .populate({ path: "vendor", select: "firstName lastName email" })
      .lean();

    if (!shop) {
      return res.status(404).json({ message: "Shop Not Found" });
    }

    await Notifications.findOneAndUpdate(
      { shopId: shop._id },
      { opened: true },
      { new: true, runValidators: true }
    );

    const { totalCommission, totalEarnings } = await getTotalEarningsByShopId(shop._id);

    const totalProducts = shop.vendor?._id
  ? await Product.countDocuments({ vendor: shop.vendor._id })
  : 0;
    const totalOrders = await Orders.countDocuments({ "items.shop": shop._id });
    const { rating, ratingCount } = await calculateShopRating(shop._id);

    return res.status(200).json({
      success: true,
      data: {
        ...shop,
        productCount: totalProducts,
        rating,
        ratingCount
      },
      totalOrders,
      totalEarnings,
      totalCommission,
      totalProducts,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*     Update One Shop by ID (Admin)    */
const updateOneShopByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;

    const shop = await Shop.findOne({ slug });

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    const { status, ...others } = req.body;

    const updateShop = await Shop.findOneAndUpdate(
      {
        slug: slug,
      },
      {
        ...others,

        status: status,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    const vendor = await User.findById(updateShop.vendor);

    // Email body content
    let htmlContent;
    if (status === "approved") {
      htmlContent = `<p>Hello ${vendor.name},</p><p>Your shop <b>${updateShop.name}</b> is now <span style="color:green">approved</span>.</p>`;
    } else {
      htmlContent = `<p>Hello ${vendor.name},</p><p>Your shop <b>${updateShop.name}</b> is <span style="color:red">not approved</span>.</p>`;
    }

    await sendEmail(vendor.email, "Shop Status Update", htmlContent);

    return res.status(200).json({ success: true, message: "Updated Shop" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*     Update Shop Status by ID (Admin)    */
const updateShopStatusByAdmin = async (req, res) => {
  try {
    const { sid } = req.params;
    const { status } = req.body;
    const updateStatus = await Shop.findOneAndUpdate(
      {
        _id: sid,
      },
      {
        status,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      data: updateStatus,
      message: "Updated Status",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*     Delete One Shop by ID (Admin)    */
const deleteOneShopByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const shop = await Shop.findOne({ slug, vendor: req.admin._id });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop Not Found" });
    }

    await singleFilesDelete(req, shop.logo._id);

    await Shop.deleteOne({ slug });
    return res.status(204).json({
      success: true,
      message: "Shop Deleted Successfully",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*     Update Shop Status (Admin)    */
const updateshopstatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "approved",
      "pending",
      "in review",
      "action required",
      "blocked",
      "rejected",
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const shop = await Shop.findOneAndUpdate(
      { slug },
      { status },
      { new: true, runValidators: true }
    );

    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop Not Found" });
    }

    return res.status(200).json({
      success: true,
      message: "Shop status updated",
      data: shop,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*     Update Shop Payout/Charges Flags (Admin)    */
const updateShopFlags = async (req, res) => {
  try {
    const { slug } = req.params;
    const { payoutsEnabled, chargesEnabled } = req.body;

    const update = {};
    if (typeof payoutsEnabled === "boolean") update.payoutsEnabled = payoutsEnabled;
    if (typeof chargesEnabled === "boolean") update.chargesEnabled = chargesEnabled;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one of payoutsEnabled or chargesEnabled must be provided as a boolean",
      });
    }

    const shop = await Shop.findOneAndUpdate(
      { slug },
      update,
      { new: true, runValidators: true }
    );

    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop Not Found" });
    }

    return res.status(200).json({
      success: true,
      message: "Shop flags updated",
      data: shop,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getShopsByAdmin,
  getOneShopByAdmin,
  updateOneShopByAdmin,
  updateShopStatusByAdmin,
  deleteOneShopByAdmin,
  getAllShopsByAdmin,
  updateshopstatus,
  updateShopFlags
};
