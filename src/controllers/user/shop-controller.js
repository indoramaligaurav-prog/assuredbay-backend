const Shop = require("../../models/Shop");
const User = require("../../models/User");
const Product = require("../../models/Product");
const Review = require("../../models/Review");

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
/*     Get All Shops (Public)    */
const getShops = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || null;
    let shopsQuery = Shop.find({ status: "approved" }).select([
      "products",
      "slug",
      "name",
      "logo",
      "description",
    ]);

    const startIndex = (page - 1) * (limit || 10);
    const totalShops = await Shop.countDocuments({ status: "approved" });
    const totalPages = Math.ceil(totalShops / limit);

    shopsQuery = shopsQuery.limit(limit).skip(startIndex).lean();

    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      totalShops: totalShops,
    };

    const shops = await shopsQuery.exec();

    for (let shop of shops) {
      const { rating, ratingCount } = await calculateShopRating(shop._id);
      shop.rating = rating;
      shop.ratingCount = ratingCount;
      shop.totalProducts = shop.products ? shop.products.length : 0;
    }
    return res.status(200).json({
      success: true,
      data: shops,
      pagination: pagination,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*     Get All Shops (Public)    */
const getAllShops = async (req, res) => {
  try {
    const shops = await Shop.find({ status: "approved" }).select([
      "logo",
      "name",
      "description",
      "slug",
      "address",
    ]);
    return res.status(200).json({
      success: true,
      data: shops,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*     Create Shop by User    */
const createShopByUser = async (req, res) => {
  try {
    const { logo, ...others } = req.body;
    const createdShop = await Shop.create({
      vendor: req.userData._id.toString(),
      ...others,
      logo: {
        ...logo,
      },

      status: "pending",
    });
    await User.findByIdAndUpdate(req.userData._id.toString(), {
      shop: createdShop._id.toString(),
      role: "vendor",
    });

    return res.status(201).json({
      success: true,
      message: "Shop created",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*    Get One Shop by User    */
const getOneShopByUser = async (req, res) => {
  try {
    const { slug } = req.params;
    const shop = await Shop.findOne({ slug: slug });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop Not Found" });
    }
    return res.status(200).json({
      success: true,
      data: shop,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*     Get All Shop Slugs    */
const getShopsSlugs = async (req, res) => {
  try {
    const shops = await Shop.find().select(["slug"]);

    res.status(200).json({
      success: true,
      data: shops,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/*     Get Shop Name by Slug    */
const getShopNameBySlug = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      slug: req.params.slug,
    }).select([
      "logo",
      "description",
      "name",
      "slug",
      "address",
      "phone",
      "createdAt",
    ]);

    res.status(200).json({
      success: true,
      data: shop,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/*     Get Shop by User    */
const getShopByUser = async (req, res) => {
  try {
    const shop = await Shop.findOne({ vendor: req.userData._id });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop Not Found" });
    }
    return res.status(200).json({
      success: true,
      data: shop,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getShops,
  getAllShops,
  getOneShopByUser,
  getShopsSlugs,
  getShopNameBySlug,
  createShopByUser,
  getShopByUser,
};
