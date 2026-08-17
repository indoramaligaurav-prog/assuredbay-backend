const Brand = require("../../models/Brand");
const Product = require("../../models/Product");
const Shop = require("../../models/Shop");
const Category = require("../../models/Category");
const users = require("../../models/User");
const { multiFilesDelete } = require("../../utils/uploader-util");

/*  Create Product by Admin    */
const createProductByAdmin = async (req, res) => {
  try {
    const body = req.body;

    const shop = await Shop.findById(req.body.shop);

    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }
    if (shop.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Vendor is not approved yet",
      });
    }

    const data = await Product.create({
      ...body,
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

/*   Get All Products by Admin (Protected)    */
const getProductsByAdmin = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      search = '',
      category,
      brand
    } = req.query;

    const skip = (page - 1) * limit;

    const matchQuery = {};

    /* STATUS FILTER */
    if (status === 'low-stock') {
      matchQuery.$or = [
        { stock: { $lt: 10 } },
        { 'variations.stock': { $lt: 10 } }
      ];
    } else if (status) {
      matchQuery.status = status;
    }

    /* SEARCH */
    if (search) {
      matchQuery.title = { $regex: search, $options: 'i' };
    }

    /* CATEGORY FILTER */
    if (category) {
      const cat = await Category.findOne({ slug: category }).select('_id');
      if (cat) matchQuery.category = cat._id;
    }

    /* BRAND FILTER */
    if (brand) {
      const br = await Brand.findOne({ slug: brand }).select('_id');
      if (br) matchQuery.brand = br._id;
    }

    const totalProducts = await Product.countDocuments(matchQuery);

    const products = await Product.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },

      /* MAIN IMAGE */
      {
        $addFields: {
          image: { $arrayElemAt: ['$images', 0] }
        }
      },

      /* PRICE & STOCK RESOLUTION */
      {
        $addFields: {
          finalPrice: {
            $cond: [
              '$hasVariations',
              { $min: '$variations.price' },
              '$mrp'
            ]
          },
          finalStock: {
            $cond: [
              '$hasVariations',
              { $sum: '$variations.stock' },
              '$stock'
            ]
          }
        }
      },

      /* RESPONSE SHAPE */
      {
        $project: {
          title: 1,
          slug: 1,
          status: 1,
          createdAt: 1,
          vendor: 1,
          category: 1,
          brand: 1,
          hasVariations: 1,
          finalPrice: 1,
          finalStock: 1,
          image: {
            url: '$image.url'
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: products,
      total: totalProducts,
      count: Math.ceil(totalProducts / limit),
      currentPage: Number(page)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/*   Get Single Product by ID (Admin Protected)    */
const getOneProductByAdmin = async (req, res) => {
  try {
    console.log('slug param:', req.params.slug);
    const product = await Product.findOne({ slug: req.params.slug });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const [category, subCategory, childCategory, brand, vendor] = await Promise.all([
      product.category ? Category.findById(product.category).select(["name", "slug"]) : null,
      product.subCategory ? Category.findById(product.subCategory).select(["name", "slug"]) : null,
      product.childCategory ? Category.findById(product.childCategory).select(["name", "slug"]) : null,
      product.brand ? Brand.findById(product.brand).select("name") : null,
      product.vendor ? users.findById(product.vendor).select(["shopName", "email"]) : null,
    ]);

    const getProductRatingAndReviews = () => {
      return Product.aggregate([
        {
          $match: { slug: req.params.slug },
        },
        {
          $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "reviews",
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
      brand,
      category,
      subCategory,
      childCategory,
      vendor,
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

/*     Update Product by ID (Admin Protected)    */
const updateProductByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;

    const updated = await Product.findOneAndUpdate(
      { slug: slug },
      {
        ...req.body,
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Product Updated",
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

/*     Delete Product by ID (Admin Protected)    */
const deletedProductByAdmin = async (req, res) => {
  try {
    const slug = req.params.slug;
    const product = await Product.findOne({ slug: slug });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Item Not Found",
      });
    }

    if (product && product.images && product.images.length > 0) {
      await multiFilesDelete(req, product.images);
    }
    const deleteProduct = await Product.deleteOne({ slug: slug });
    if (!deleteProduct) {
      return res.status(400).json({
        success: false,
        message: "Product Deletion Failed",
      });
    }
    await Shop.findByIdAndUpdate(req.body.shop, {
      $pull: {
        products: product._id,
      },
    });
    return res.status(204).json({
      success: true,
      message: "Product Deleted ",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};


// ── GET /admin/products/status/draft — list for approval queue ──
const getAllDraftProductsByAdmin = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = { status: "pending" };

   const [products, total] = await Promise.all([
  Product.find(filter)
    .populate({
      path: "vendor",
      select: "email shop",
      populate: { path: "shop", select: "name" }
    })
    .populate("childCategory", "name")
    .select("title slug images mrp discountPrice pricingMode stock hasVariations variations createdAt vendor childCategory status")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean(),
  Product.countDocuments(filter),
]);


    console.log("Draft Products =>", products);

  const data = products.map((p) => {
  const hasVariant = p.hasVariations && Array.isArray(p.variations) && p.variations.length > 0;
  const variant = hasVariant ? p.variations[0] : null;

  return {
    _id:          p._id,
    slug:         p.slug,
    productName:  p.title,
    image:        variant?.images?.[0]?.url || p.images?.[0]?.url || null,
    vendorName:   p.vendor?.shop?.name || "-",
    childCategory: p.childCategory?.name || "-",
    price:        hasVariant
                    ? (variant.discountPrice ?? variant.price ?? null)
                    : (p.discountPrice ?? p.mrp ?? null),
    stock:        hasVariant ? variant.stock : p.stock,
    hasVariations: hasVariant,
    variantCount: hasVariant ? p.variations.length : 0,
    addedAt:      p.createdAt,
    status:       p.status,
  };
});

    res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getAllDraftProductsByAdmin error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /admin/products/:slug/approve ──
const approveProductByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOneAndUpdate(
      { slug },
      { status: "published" },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, message: "Product approved", data: product });
  } catch (err) {
    console.error("approveProductByAdmin error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /admin/products/:slug/reject ──
const rejectProductByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOneAndUpdate(
      { slug },
      { status: "reject" },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, message: "Product rejected", data: product });
  } catch (err) {
    console.error("rejectProductByAdmin error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createProductByAdmin,
  getProductsByAdmin,
  getOneProductByAdmin,
  updateProductByAdmin,
  deletedProductByAdmin,
  getAllDraftProductsByAdmin,
  approveProductByAdmin,
  rejectProductByAdmin
};
