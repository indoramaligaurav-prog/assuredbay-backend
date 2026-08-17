const ChildCategory = require("../../models/ChildCategory");

//  Get Child Categories by Slug
const getChildCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const childCategory = await ChildCategory.findOne({ slug }).populate({
      path: "subCategory",
      select: ["name", "slug", "cover", "parentCategory"],
      populate: {
        path: "parentCategory",
        select: ["name", "slug", "cover"],
      },
    });

    if (!childCategory) {
      return res.status(400).json({
        success: false,
        message: "ChildCategory Not Found",
      });
    }

    res.status(200).json({ success: true, data: childCategory });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
//  Get Only Slugs of All Active Categories
const getChildCategoriesSlugs = async (req, res) => {
  try {
    const categories = await ChildCategory.find({ status: "active" }).select(
      "slug"
    );

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Get All Child Categories (Public)
const getChildCategories = async (req, res) => {
  try {
    const categories = await ChildCategory.find({ status: "active" }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Get All Child Categories (With Pagination, Search, or Admin Access)
const getAllChildCategories = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "" } = req.query;

    const skip = parseInt(limit) || 10;
    const query = {
      name: { $regex: search, $options: "i" },
      status: "active",
    };
    const totalChildCategories = await ChildCategory.find(query);
    const categories = await ChildCategory.find(query, null, {
      skip: skip * (parseInt(page) - 1 || 0),
      limit: skip,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: categories,
      count: Math.ceil(totalChildCategories.length / skip),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllChildCategories,
  getChildCategoryBySlug,
  getChildCategories,
  getChildCategoriesSlugs,
};
