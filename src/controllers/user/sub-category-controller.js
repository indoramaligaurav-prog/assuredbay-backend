const SubCategories = require("../../models/SubCategory");
const Category = require("../../models/Category");

/*     Get Subcategory by Slug    */
const getSubCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const subcategories = await SubCategories.findOne({ slug })
      .populate("childCategories")
      .populate("parentCategory");
    const categories = await Category.find().select(["name"]);

    if (!subcategories) {
      return res.status(400).json({
        success: false,
        message: "SubCategory Not Found",
      });
    }

    res.status(200).json({ success: true, data: subcategories, categories });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
/*     Get All Subcategories    */
const getSubCategories = async (req, res) => {
  try {
    const subcategories = await SubCategories.find({ status: "active" })
      .sort({
        createdAt: -1,
      })
      .populate("childCategories");

    res.status(200).json({
      success: true,
      data: subcategories,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
/*     Get All Subcategories    */
const getAllSubCategories = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "" } = req.query;

    const skip = parseInt(limit) || 10;
    const query = {
      name: { $regex: search, $options: "i" },
      status: "active",
    };
    const totalSubCategories = await SubCategories.find(query);
    const subcategories = await SubCategories.find(query, null, {
      skip: skip * (parseInt(page) - 1 || 0),
      limit: skip,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: subcategories,
      count: Math.ceil(totalSubCategories.length / skip),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Get Only Slugs of All Active SubCategories
const getSubCategoriesSlugs = async (req, res) => {
  try {
    const categories = await SubCategories.find({ status: "active" })
      .select("slug")
      .populate({ path: "parentCategory", select: ["slug"] });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
module.exports = {
  getAllSubCategories,
  getSubCategoryBySlug,
  getSubCategoriesSlugs,
  getSubCategories,
};
