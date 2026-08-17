const Brand = require("../../models/Brand");
const Product = require("../../models/Product");
const Shop = require("../../models/Shop");
const Category = require("../../models/Category");
const SubCategory = require("../../models/SubCategory");
const ChildCategory = require("../../models/ChildCategory");
const Attribute = require("../../models/Attribute");

/*     Get Filters for Products (Public)    */
const getFilters = async (req, res) => {
  try {
    const products = await Product.find({
      status: "published",
    }).select([
      "mrp",
      "hasVariations",
      "variations",
      "brand",
      "variationAttributes",
    ]);

    let prices = [];
    let brandIds = new Set();
    let attributesMap = new Map();

    for (const product of products) {
      // Collect brand IDs
      if (product.brand) {
        brandIds.add(product.brand.toString());
      }

      // Price logic
      if (product.hasVariations && Array.isArray(product.variations)) {
        const variantPrices = product.variations
          .filter(v => typeof v.price === "number")
          .map(v => v.price);

        prices.push(...variantPrices);
      } else {
        if (typeof product.mrp === "number") {
          prices.push(product.mrp);
        }
      }

      // Collect variation attributes
      if (Array.isArray(product.variationAttributes)) {
        for (const attr of product.variationAttributes) {
          if (!attributesMap.has(attr.name)) {
            attributesMap.set(attr.name, new Set());
          }

          attr.values.forEach(value =>
            attributesMap.get(attr.name).add(value)
          );
        }
      }
    }

    // Min & Max prices
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 100000;

    // Format attributes
    const attributes = Array.from(attributesMap.entries()).map(
      ([name, values]) => ({
        name,
        values: Array.from(values),
      })
    );

    // Fetch brands
    const brands = await Brand.find({
      status: { $ne: "inactive" },
      _id: { $in: Array.from(brandIds) },
    }).select("name slug");

    res.status(200).json({
      success: true,
      data: {
        prices: [min, max],
        attributes,
        brands,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*     Get Filters by Category Slug (Public)    */
const getFiltersByCategory = async (req, res) => {
  try {
    const { shop, category } = req.params;

    const shopData = await Shop.findOne({ slug: shop }).select("_id");
    if (!shopData) {
      return res
        .status(404)
        .json({ success: false, message: "Shop Not Found" });
    }

    const categoryData = await Category.findOne({ slug: category }).select(
      "_id name"
    );
    if (!categoryData) {
      return res
        .status(404)
        .json({ success: false, message: "Category Not Found" });
    }

    const products = await Product.find({
      status: "published",
      category: categoryData._id,
      shop: shopData._id,
    }).select(["type", "price", "variants", "gender", "brand"]);

    let prices = [];
    let genders = new Set();
    let brandIds = new Set();

    for (const product of products) {
      // Collect gender and brandId
      if (product.gender) genders.add(product.gender);
      if (product.brand) brandIds.add(product.brand.toString());

      // Collect price based on type
      if (product.type === "simple") {
        if (typeof product.price === "number") prices.push(product.price);
      } else if (product.type === "variable") {
        const variantPrices = product.variants
          .filter((v) => typeof v.price === "number")
          .map((v) => v.price);
        prices.push(...variantPrices);
      }
    }

    // Get min & max prices
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 100000;

    // Fetch attributes & brands
    const attributes = await Attribute.find({});
    const brands = await Brand.find({
      status: { $ne: "inactive" },
      _id: { $in: Array.from(brandIds) },
    }).select("name slug");

    res.status(200).json({
      success: true,
      data: {
        attributes,
        prices: [min, max],
        genders: Array.from(genders),
        brands,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
/*     Get Filters by SubCategory Slug (Public)    */
const getFiltersBySubCategory = async (req, res) => {
  try {
    const { shop, category, subcategory } = req.params;

    // Fetch shop data
    const shopData = await Shop.findOne({ slug: shop }).select(["_id"]);
    if (!shopData) {
      return res
        .status(404)
        .json({ success: false, message: "Shop Not Found" });
    }
    const categoryData = await Category.findOne({ slug: category }).select([
      "_id",
      "name",
    ]);
    if (!categoryData) {
      return res
        .status(404)
        .json({ success: false, message: "Category Not Found" });
    }
    // Fetch subcategory data
    const subcategoryData = await SubCategory.findOne({
      slug: subcategory,
      parentCategory: categoryData._id,
    }).select(["_id"]);
    if (!subcategoryData) {
      return res
        .status(404)
        .json({ success: false, message: "Subcategory Not Found" });
    }

    // Find products based on shop and subCategory
    const products = await Product.find({
      status: "published",
      subCategory: subcategoryData._id,
      shop: shopData._id,
    }).select(["type", "price", "variants", "gender", "brand"]);

    let prices = [];
    let genders = new Set();
    let brandIds = new Set();

    for (const product of products) {
      // Collect gender and brandId
      if (product.gender) genders.add(product.gender);
      if (product.brand) brandIds.add(product.brand.toString());

      // Collect price based on type
      if (product.type === "simple") {
        if (typeof product.price === "number") prices.push(product.price);
      } else if (product.type === "variable") {
        const variantPrices = product.variants
          .filter((v) => typeof v.price === "number")
          .map((v) => v.price);
        prices.push(...variantPrices);
      }
    }

    // Get min & max prices
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 100000;

    // Fetch attributes & brands
    const attributes = await Attribute.find({});
    const brands = await Brand.find({
      status: { $ne: "inactive" },
      _id: { $in: Array.from(brandIds) },
    }).select("name slug");

    res.status(200).json({
      success: true,
      data: {
        attributes,
        prices: [min, max],
        genders: Array.from(genders),
        brands,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
/*     Get Filters by Shop (Public)    */
const getFiltersByShop = async (req, res) => {
  try {
    const { shop } = req.params;

    const shopData = await Shop.findOne({ slug: shop }).select([
      "name",
      "slug",
    ]);
    if (!shopData) {
      return res
        .status(404)
        .json({ success: false, message: "Shop Not Found" });
    }

    const products = await Product.find({
      status: "published",
      shop: shopData._id,
    }).select(["type", "price", "variants", "gender", "brand"]);

    let prices = [];
    let genders = new Set();
    let brandIds = new Set();

    for (const product of products) {
      // Collect gender and brandId
      if (product.gender) genders.add(product.gender);
      if (product.brand) brandIds.add(product.brand.toString());

      // Collect price based on type
      if (product.type === "simple") {
        if (typeof product.price === "number") prices.push(product.price);
      } else if (product.type === "variable") {
        const variantPrices = product.variants
          .filter((v) => typeof v.price === "number")
          .map((v) => v.price);
        prices.push(...variantPrices);
      }
    }

    // Get min & max prices
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 100000;

    // Fetch attributes & brands
    const attributes = await Attribute.find({});
    const brands = await Brand.find({
      status: { $ne: "inactive" },
      _id: { $in: Array.from(brandIds) },
    }).select("name slug");

    res.status(200).json({
      success: true,
      data: {
        attributes,
        prices: [min, max],
        genders: Array.from(genders),
        brands,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
/*     Get All Product Slugs (Public)    */
const getAllProductSlug = async (req, res) => {
  try {
    const products = await Product.find().select("slug");

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*    Get Related Products (Public)    */
const relatedProducts = async (req, res) => {
  try {
    const pid = req.params.pid;
    const product = await Product.findById(pid).select("_id category");

    const related = await Product.aggregate([
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

          variantWithLeastStock: {
            $reduce: {
              input: "$variants",
              initialValue: {
                stockQuantity: Number.MAX_VALUE,
                price: null,
                salePrice: null,
              },
              in: {
                $cond: [
                  { $lt: ["$$this.stockQuantity", "$$value.stockQuantity"] },
                  {
                    stockQuantity: "$$this.stockQuantity",
                    price: "$$this.price",
                    salePrice: "$$this.salePrice",
                  },
                  "$$value",
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          stockQuantity: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.stockQuantity",
              "$stockQuantity",
            ],
          },
          price: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.price",
              "$price",
            ],
          },
          salePrice: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.salePrice",
              "$salePrice",
            ],
          },
        },
      },

      {
        $match: {
          category: product.category,
          _id: { $ne: product._id },
          status: "published",
        },
      },
      {
        $limit: 8,
      },
      {
        $project: {
          images: 1,
          name: 1,
          slug: 1,

          type: 1,
          discount: 1,
          likes: 1,
          salePrice: 1,
          price: 1,
          averageRating: 1,
          stockQuantity: 1,
          vendor: 1,
          shop: 1,
          createdAt: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: related });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
/*     Get One Product by Slug (Public)    */
const getOneProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate({
        path: "shop",
        select: "brand slug",
      })
      .populate({
        path: "category",
        select: "name slug",
      })
      .populate({
        path: "subCategory",
        select: "name slug",
      })
      .populate({
        path: "childCategory",
        select: "name slug",
      })
      .populate({
        path: "brand",
        select: "name slug",
      });

    const getProductRatingAndReviews = async () => {
      const product = await Product.aggregate([
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
            _id: 0,
            totalReviews: { $size: "$reviews" },
            averageRating: {
              $avg: "$reviews.rating",
            },
          },
        },
      ]);

      return product[0];
    };

    const reviewReport = await getProductRatingAndReviews();

    // ── Increment view (unique by IP per day) ──
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const alreadyViewed = product.views?.some(
        (v) => v.ip === ip && new Date(v.date) >= startOfDay
      );

      if (!alreadyViewed) {
        await Product.findByIdAndUpdate(product._id, {
          $push: { views: { ip, date: new Date() } },
        });
      }

    return res.status(200).json({
      success: true,
      data: product,
      totalReviews: reviewReport.totalReviews,
      totalRating: reviewReport.averageRating || 0,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const getCompareProducts = async (req, res) => {
  try {
    const fetchedProducts = await Product.find({
      _id: { $in: req.body.products },
      status: "published",
    }).select(["_id"]);

    const products = await Product.aggregate([
      {
        $match: {
          _id: { $in: fetchedProducts.map((v) => v._id) },
          status: "published",
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "reviews",
          foreignField: "_id",
          as: "reviews",
        },
      },
      // 🔎 Lookup shop
      {
        $lookup: {
          from: "shops",
          localField: "shop",
          foreignField: "_id",
          as: "shop",
        },
      },
      { $unwind: { path: "$shop", preserveNullAndEmptyArrays: true } },
      // 🔎 Lookup brand
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },

      // 🔎 Lookup category
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      // 🔎 Lookup subCategory
      {
        $lookup: {
          from: "subcategories",
          localField: "subCategory",
          foreignField: "_id",
          as: "subCategory",
        },
      },
      { $unwind: { path: "$subCategory", preserveNullAndEmptyArrays: true } },

      // 🔎 Lookup childCategory
      {
        $lookup: {
          from: "childcategories",
          localField: "childCategory",
          foreignField: "_id",
          as: "childCategory",
        },
      },
      { $unwind: { path: "$childCategory", preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          averageRating: { $avg: "$reviews.rating" },
          variantWithLeastStock: {
            $reduce: {
              input: "$variants",
              initialValue: {
                stockQuantity: Number.MAX_VALUE,
                price: null,
                salePrice: null,
              },
              in: {
                $cond: [
                  { $lt: ["$$this.stockQuantity", "$$value.stockQuantity"] },
                  {
                    stockQuantity: "$$this.stockQuantity",
                    price: "$$this.price",
                    salePrice: "$$this.salePrice",
                  },
                  "$$value",
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          stockQuantity: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.stockQuantity",
              "$stockQuantity",
            ],
          },
          price: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.price",
              "$price",
            ],
          },
          salePrice: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.salePrice",
              "$salePrice",
            ],
          },
          variants: {
            $map: {
              input: "$variants",
              as: "v",
              in: {
                _id: "$$v._id",
                name: "$$v.name",
                variant: "$$v.variant",
                price: "$$v.price",
                salePrice: "$$v.salePrice",
                stockQuantity: "$$v.stockQuantity",
              },
            },
          },
        },
      },
      {
        $project: {
          images: 1,
          name: 1,
          slug: 1,
          variants: 1,
          discount: 1,
          likes: 1,
          type: 1,
          salePrice: 1,
          price: 1,
          averageRating: 1,
          stockQuantity: 1,
          vendor: 1,
          createdAt: 1,
          "shop.name": 1,
          "brand.name": 1,
          "category.name": 1,
          "subCategory.name": 1,
          "childCategory.name": 1,
        },
      },
    ]);

    return res.status(201).json({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/*     Get Products (Public)    */
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      name,
      top,
      date,
      price: sortPrice,
      category,
      subcategory,
      childcategory,
      brand,
      shop,
      isFeatured,
      prices, // <-- Added prices param
      ...dynamicFilters // like color=red_green&size=xl_md
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const matchStage = { status: "published" };

    if (category) {
      const categoryDoc = await Category.findOne({ slug: category });
      if (!categoryDoc) {
        return res
          .status(200)
          .json({ success: true, products: [], total: 0, count: 0 });
      }
      matchStage.category = categoryDoc._id;
    }

    if (subcategory) {
      const subDoc = await SubCategory.findOne({ slug: subcategory });
      if (!subDoc) {
        return res
          .status(200)
          .json({ success: true, products: [], total: 0, count: 0 });
      }
      matchStage.subCategory = subDoc._id;
    }

    if (childcategory) {
      const childDoc = await ChildCategory.findOne({ slug: childcategory });
      if (!childDoc) {
        return res
          .status(200)
          .json({ success: true, products: [], total: 0, count: 0 });
      }
      matchStage.childCategory = childDoc._id;
    }

    if (brand) {
      const brandDoc = await Brand.findOne({ slug: brand });
      if (!brandDoc) {
        return res
          .status(200)
          .json({ success: true, products: [], total: 0, count: 0 });
      }
      matchStage.brand = brandDoc._id;
    }

    if (shop) {
      const shopDoc = await Shop.findOne({ slug: shop });
      if (!shopDoc) {
        return res
          .status(200)
          .json({ success: true, products: [], total: 0, count: 0 });
      }
      matchStage.shop = shopDoc._id;
    }
    if (isFeatured !== undefined) {
      matchStage.isFeatured = isFeatured === "true";
    }

    const variantConditions = [];
    for (const key in dynamicFilters) {
      const values = dynamicFilters[key].split("_");

      // Match variant key exists
      variantConditions.push({
        "variants.variant": { $regex: new RegExp(`(^|/)${key}(/|$)`, "i") },
      });

      // Match variant name contains one of the values (like abc)
      variantConditions.push({
        "variants.name": { $regex: new RegExp(`(${values.join("|")})`, "i") },
      });
    }

    // Add price range filter if `prices` is provided
    let priceRangeMatch = [];
    if (prices && prices.includes("_")) {
      const [min, max] = prices.split("_").map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        priceRangeMatch = [
          {
            $match: {
              salePrice: { $gte: min, $lte: max },
            },
          },
        ];
      }
    }

    const pipeline = [
      { $match: matchStage },

      {
        $facet: {
          simple: [
            ...(Object.keys(dynamicFilters).length > 0
              ? [{ $match: { _id: null } }]
              : []), // return nothing
            ...(Object.keys(dynamicFilters).length === 0
              ? [
                  { $match: { type: "simple" } },
                  ...priceRangeMatch,
                  {
                    $lookup: {
                      from: "reviews",
                      localField: "reviews",
                      foreignField: "_id",
                      as: "reviewDetails",
                    },
                  },
                  {
                    $addFields: {
                      averageRating: {
                        $cond: [
                          { $gt: [{ $size: "$reviewDetails" }, 0] },
                          { $avg: "$reviewDetails.rating" },
                          0,
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      slug: 1,
                      type: 1,
                      price: {
                        $cond: [
                          { $eq: ["$type", "variable"] },
                          "$matchedVariant.price",
                          "$price",
                        ],
                      },
                      salePrice: {
                        $cond: [
                          { $eq: ["$type", "variable"] },
                          "$matchedVariant.salePrice",
                          "$salePrice",
                        ],
                      },
                      stockQuantity: {
                        $cond: [
                          { $eq: ["$type", "variable"] },
                          "$matchedVariant.stockQuantity",
                          "$stockQuantity",
                        ],
                      },
                      images: {
                        $cond: [
                          { $eq: ["$type", "variable"] },
                          "$matchedVariant.images",
                          "$images",
                        ],
                      },
                      variant: {
                        $cond: [
                          { $eq: ["$type", "variable"] },
                          "$matchedVariant.variant",
                          null,
                        ],
                      },
                      rating: "$averageRating",
                    },
                  },
                ]
              : []),
          ],
          variable: [
            { $match: { type: "variable" } },
            { $unwind: "$variants" },
            ...(variantConditions.length > 0
              ? [{ $match: { $and: variantConditions } }]
              : []),
            ...(priceRangeMatch.length > 0
              ? [
                  {
                    $match: {
                      "variants.salePrice": {
                        $gte: priceRangeMatch[0].$match.salePrice.$gte,
                        $lte: priceRangeMatch[0].$match.salePrice.$lte,
                      },
                    },
                  },
                ]
              : []),
            {
              $lookup: {
                from: "reviews",
                localField: "reviews",
                foreignField: "_id",
                as: "reviewDetails",
              },
            },
            {
              $addFields: {
                averageRating: {
                  $cond: [
                    { $gt: [{ $size: "$reviewDetails" }, 0] },
                    { $avg: "$reviewDetails.rating" },
                    0,
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                type: 1,
                isFeatured: 1,
                images: 1,
                status: 1,
                averageRating: 1,
                variant: "$variants",
              },
            },
          ],
        },
      },
      {
        $project: {
          allProducts: {
            $concatArrays: ["$simple", "$variable"],
          },
        },
      },
      { $unwind: "$allProducts" },
      { $replaceRoot: { newRoot: "$allProducts" } },

      {
        $sort: (() => {
          const sort = {};
          if (name) sort.name = parseInt(name);
          if (top) sort.averageRating = parseInt(top);
          if (date) sort.createdAt = parseInt(date);
          if (sortPrice) sort["variant.salePrice"] = parseInt(sortPrice);
          return Object.keys(sort).length ? sort : { createdAt: -1 };
        })(),
      },

      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const paginatedPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];
    const products = await Product.aggregate(paginatedPipeline);

    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Product.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;
    const count = Math.ceil(total / parseInt(limit));
    const mappedProducts = products.map((product) => {
      if (product.type === "variable") {
        return {
          ...product,
          price: product.variant.price,
          salePrice: product.variant.salePrice,
          stockQuantity: product.variant.stockQuantity,
          variant: product.variant.name,
          images: product.variant.images,
        };
      }
      return product;
    });

    res.json({
      success: true,
      data: mappedProducts,
      total,
      count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};
module.exports = {
  getProducts,
  getFilters,
  getFiltersByCategory,
  getFiltersByShop,
  getAllProductSlug,
  getFiltersBySubCategory,
  relatedProducts,
  getOneProductBySlug,
  getCompareProducts,
};
