const Products = require("../../models/Product");
const Shop = require("../../models/Shop");
const Category = require("../../models/Category");
const SubCategory = require("../../models/SubCategory");

/*     Global Search (Products / Shops / Categories)    */
const Search = async (req, res) => {
  try {
    const { query, shop, subCategory, category } = req.body;
    const currenctShop = shop ? await Shop.findById(shop).select(["_id"]) : "";
    const catId = category
      ? await Category.findById(category).select(["_id"])
      : "";
    const subCatId = subCategory
      ? await SubCategory.findById(subCategory).select(["_id"])
      : "";
 
    if (shop && !currenctShop) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid shop ID" });
    }

    if (category && !catId) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid category ID" });
    }

    if (subCategory && !subCatId) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid subcategory ID" });
    }
    const products = await Products.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                { name: { $regex: query || "", $options: "i" } },
                { "variants.name": { $regex: query || "", $options: "i" } },
                { "variants.sku": { $regex: query || "", $options: "i" } },
                { "variants.variant": { $regex: query || "", $options: "i" } },
              ],
            },
            { status: "published" },
            ...(currenctShop ? [{ shop: currenctShop._id }] : []),
            ...(catId ? [{ category: catId._id }] : []),
            ...(subCatId ? [{ subCategory: subCatId._id }] : []),
          ],
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryData",
        },
      },
      {
        $addFields: {
          averageRating: { $avg: "$reviews.rating" },
          image: { $arrayElemAt: ["$images", 0] },
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
              { $round: ["$variantWithLeastStock.price", 2] },
              { $round: ["$price", 2] },
            ],
          },
          salePrice: {
            $cond: [
              { $eq: ["$type", "variable"] },
              { $round: ["$variantWithLeastStock.salePrice", 2] },
              { $round: ["$salePrice", 2] },
            ],
          },
        },
      },
      {
        $project: {
          image: { url: "$image.url" },
          name: 1,
          salePrice: 1,
          price: 1,
          slug: 1,
          _id: 1,
          category: { $arrayElemAt: ["$categoryData.name", 0] },
        },
      },
      {
        $limit: 10,
      },
    ]);
    return res.status(201).json({
      success: true,
      products,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*    🧰 Get All Product Filter Options (Public)    */
const getFilters = async (req, res) => {
  try {
    await SubCategory.findOne();
    const categories = await Category.find()
      .select(["_id", "name", "slug", "subCategories"])
      .populate({
        path: "subCategories",
        select: ["_id", "name", "slug"],
      });

    const shops = await Shop.find({ status: "approved" }).select([
      "_id",
      "name",
      "slug",
    ]);

    return res.status(200).json({
      success: true,
      categories,
      shops,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { Search, getFilters };
