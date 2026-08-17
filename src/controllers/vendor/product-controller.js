const Product = require("../../models/Product");
const Shop = require("../../models/Shop");
const Category = require("../../models/Category");
const Brand = require("../../models/Brand");
const { multiFilesDelete } = require("../../utils/uploader-util");
const PickupLocation = require('../../models/PickupLocation');

/*     Get All Products by Vendor    */
const getProductsByVendor = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search = "" } = req.query;

    const skip = (page - 1) * limit;

    let match = {
      vendor: req.vendor._id,
      title: { $regex: search, $options: "i" }
    };

    if (status && status !== "lowstock") {
      match.status = status;
    }

    // LOW STOCK FILTER
    if (status === "lowstock") {
      match.$or = [
        { hasVariations: false, stock: { $lt: 10 } },
        { hasVariations: true, "variations.stock": { $lt: 10 } }
      ];
    }

    const total = await Product.countDocuments(match);

    const products = await Product.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },

      {
        $addFields: {
          mainImage: { $arrayElemAt: ["$images", 0] },

          totalStock: {
  $cond: [
    "$hasVariations",
    { $sum: "$variations.stock" },
    "$stock"
  ]
},

          lowestVariantPrice: {
  $cond: [
    "$hasVariations",
    { $min: "$variations.price" },
    "$mrp"
  ]
},
lowestVariantDiscount: {
  $cond: [
    "$hasVariations",
    { $min: "$variations.discountPrice" },
    "$discountPrice"
  ]
}
        }
      },

      {
  $project: {
    title: 1,
    status: 1,
    vendor: 1,
    createdAt: 1,
    hasVariations: 1,
    image: "$mainImage.url",
    stock: "$totalStock",
   mrp: "$lowestVariantPrice",
discountPrice: "$lowestVariantDiscount",
    mrp: 1,
    sku: 1,
        slug: 1, 
    variations: {
      $map: {
        input: "$variations",
        as: "v",
        in: {
          sku: "$$v.sku",
          price: "$$v.price",
          discountPrice: "$$v.discountPrice",
          stock: "$$v.stock",
        }
      }
    },
    views: {
  $size: {
    $filter: {
      input: "$views",
      as: "v",
      cond: { $gte: ["$$v.date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] }
    }
  }
},
  }
}
    ]);

    res.json({
      success: true,
      data: products,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


/*     Create Product by Vendor    */
const createProductByVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      vendor: req.vendor._id.toString(),
    });

    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }
    if (shop.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "No Action Before You’re Approved",
      });
    }

    const data = await Product.create({
      ...req.body,
      shop: shop._id,
      likes: 0,
      status: "pending",
    });
    await Shop.findByIdAndUpdate(shop._id.toString(), {
      $addToSet: {
        products: data._id,
      },
    });
    res.status(201).json({
      success: true,
      message: "Product Created",
      data: data,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/*     Get Single Product by Vendor    */
const getOneProductVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      vendor: req.vendor._id.toString(),
    });
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }

    const product = await Product.findOne({
      slug: req.params.slug,
      shop: shop._id,
    });
    const category = await Category.findById(product.category).select([
      "name",
      "slug",
    ]);
    const brand = await Brand.findById(product.brand).select("name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Vendor Product Not Found",
      });
    }
    const getProductRatingAndReviews = () => {
      return Product.aggregate([
        {
          $match: { slug: req.params.slug },
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
          $project: {
            _id: 1,
            name: 1,
            rating: { $avg: "$reviews.rating" },
            totalReviews: { $size: "$reviews" },
          },
        },
      ]);
    };

    const reviewReport = await getProductRatingAndReviews();
    return res.status(200).json({
      success: true,
      data: product,
      totalRating: reviewReport[0]?.rating,
      totalReviews: reviewReport[0]?.totalReviews,
      brand: brand,
      category: category,
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

/*     Update Product by Vendor    */
const updateProductByVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      vendor: req.vendor._id.toString(),
    });
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }

    const { slug } = req.params;
    let currentProduct = await Product.findOne({
      slug,
    });
    const { ...body } = req.body;

    const updated = await Product.findOneAndUpdate(
      { slug: slug, shop: shop._id },
      {
        ...body,
        shop: shop._id,
        status: currentProduct.status === "published" ? "published" : "pending",
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message:
        currentProduct.status === "published"
          ? "Product updated successfully"
          : "Product submitted for review",
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

/*     Delete Product by Vendor    */
const deleteProductByVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      vendor: req.vendor._id.toString(),
    });
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }
    const slug = req.params.slug;
    const product = await Product.findOne({
      slug: slug,
      shop: shop._id,
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Vendor Product Not Found",
      });
    }

    if (product && product.images && product.images.length > 0) {
      await multiFilesDelete(req, product.images);
    }
    const deleteProduct = await Product.deleteOne({ slug: slug });
    await Shop.findByIdAndUpdate(shop._id.toString(), {
      $pull: {
        products: product._id,
      },
    });
    if (!deleteProduct) {
      return res.status(400).json({
        success: false,
        message: "Product Deletion Failed",
      });
    }
    return res.status(204).json({
      success: true,
      message: "Product Deleted ",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getPickupLocations = async (req, res) => {
  try {
    const locations = await PickupLocation.find({
      vendor: req.vendor._id,
      status: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: locations,
    });
  } catch (err) {
    console.error('getPickupLocations error:', err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const createPickupLocation = async (req, res) => {
  try {
    const {
      name,
      streetAddress,
      country,
      state,
      city,
      zipcode,
    } = req.body;

    if (!name)
      return res.status(400).json({
        success: false,
        message: 'Location name is required',
      });

    if (!streetAddress)
      return res.status(400).json({
        success: false,
        message: 'Street address is required',
      });

    if (!country)
      return res.status(400).json({
        success: false,
        message: 'Country is required',
      });

    if (!state)
      return res.status(400).json({
        success: false,
        message: 'State is required',
      });

    if (!city)
      return res.status(400).json({
        success: false,
        message: 'City is required',
      });

    const location = await PickupLocation.create({
      vendor: req.vendor._id,
      name,
      streetAddress,
      country,
      state,
      city,
      zipcode,
    });

    res.status(201).json({
      success: true,
      data: location,
    });
  } catch (err) {
    console.error('createPickupLocation error:', err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  createProductByVendor,
  getProductsByVendor,
  getOneProductVendor,
  updateProductByVendor,
  deleteProductByVendor,
  getPickupLocations,
  createPickupLocation
};
