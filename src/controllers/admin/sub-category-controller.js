const SubCategory = require("../../models/SubCategory");
const ChildCategory = require("../../models/ChildCategory");
const Product = require("../../models/Product");
const Category = require("../../models/Category");
const { singleFileDelete } = require("../../utils/uploader-util");

/*     Create Subcategory by Admin    */
const createSubCategoryByAdmin = async (req, res) => {
  try {
    const { cover, ...others } = req.body;

    const category = await SubCategory.create({
      ...others,
      cover: {
        ...cover,
      },
    });
    await Category.findByIdAndUpdate(others.parentCategory, {
      $addToSet: {
        subCategories: category._id,
      },
    });

    res.status(201).json({ success: true, message: "Subcategory Created" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/*     Get All Subcategories by Admin    */
const getSubCategoriesByAdmin = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "", category, status } = req.query;
    const currentCategory = category
      ? await Category.findOne({ slug: category })
      : null;
    if (category && !currentCategory) {
      res.status(404).json({ success: false, message: "Category not found!" });
    }
    const skip = parseInt(limit) || 10;
    const query = {
      name: { $regex: search, $options: "i" },
      ...(currentCategory && { parentCategory: currentCategory._id }),
    };

    if (status) {
      query.status = status;
    }

    const totalSubCategories = await SubCategory.find(query);

    const subcategories = await SubCategory.find(query, null, {
      skip: skip * (parseInt(page) - 1 || 0),
      limit: skip,
    })
      .populate({ path: "parentCategory", select: ["name", "cover", "slug"] })
      .sort({
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
/*    Get Subcategory by Slug (Admin)    */
const getSubCategoryBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const subcategories = await SubCategory.findOne({ slug });
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
/*     Update Subcategory by Slug (Admin)    */
const updateSubCategoryBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const { cover, ...others } = req.body;
    const currentCategory = await SubCategory.findOneAndUpdate(
      { slug },
      {
        ...others,
        cover: {
          ...cover,
        },
      },
      { new: true, runValidators: true }
    );

    if (
      String(currentCategory.parentCategory) !== String(others.parentCategory)
    ) {
      await Category.findByIdAndUpdate(currentCategory.parentCategory, {
        $pull: { subCategories: currentCategory._id },
      });

      await Category.findByIdAndUpdate(others.parentCategory, {
        $addToSet: { subCategories: currentCategory._id },
      });
    }

    res.status(200).json({
      success: true,
      message: "Subcategory Updated",
      currentCategory,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
/*     Delete Subcategory by Slug (Admin)    */
const deleteSubCategoryBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;

    const childCategories = await ChildCategory.find({
      subCategory: subCategory._id,
    });
    const childCategoryIds = childCategories.map((c) => c._id);

    await Product.deleteMany({ childCategory: { $in: childCategoryIds } });

    await ChildCategory.deleteMany({ subCategory: subCategory._id });

    await Product.deleteMany({ subCategory: subCategory._id });
    const subCategory = await SubCategory.findOneAndDelete({ slug });
    await singleFileDelete(req, subCategory.cover._id);

    await Category.findByIdAndUpdate(subCategory.parentCategory, {
      $pull: { subCategories: subCategory._id },
    });

    if (!subCategory) {
      return res.status(400).json({
        success: false,
        message: "SubCategory Not Found",
      });
    }

    res
      .status(204)
      .json({ success: true, message: "SubCategory Deleted Successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
/*     Get All Subcategories by Admin    */
const getAllSubCategoriesByAdmin = async (req, res) => {
  try {
    const subcategories = await SubCategory.find()
      .populate({ path: "parentCategory", select: ["name", "cover", "slug"] })
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      data: subcategories,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSubCategoryByAdmin,
  updateSubCategoryBySlugByAdmin,
  deleteSubCategoryBySlugByAdmin,
  getSubCategoriesByAdmin,
  getSubCategoryBySlugByAdmin,
  getAllSubCategoriesByAdmin,
};
