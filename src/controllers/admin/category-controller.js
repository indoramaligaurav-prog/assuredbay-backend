const Category = require("../../models/Category");
const SubCategory = require("../../models/SubCategory");
const ChildCategory = require("../../models/ChildCategory");
const Product = require("../../models/Product");
const { singleFileDelete } = require("../../utils/uploader-util");

//  Create Category by Admin
const createCategoryByAdmin = async (req, res) => {
  try {
    const { cover, ...others } = req.body;
    await Category.create({
      ...others,
      cover: {
        ...cover,
      },
    });

    res.status(201).json({ success: true, message: "Category Created" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
//  Get All Categories by Admin
const getCategoriesByAdmin = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "", status } = req.query;

    const skip = parseInt(limit) || 10;
    const query = {
      name: { $regex: search, $options: "i" },
    };

    if (status) {
      query.status = status;
    }
    const totalCategories = await Category.find(query);
    const categories = await Category.find(query, null, {
      skip: skip * (parseInt(page) - 1 || 0),
      limit: skip,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: categories,
      count: Math.ceil(totalCategories.length / skip),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getCategoriesByAdminforChild = async (req, res) => {
  try {
    const categories = await Category.find().select(["name"]).sort({ createdAt: -1 }).lean();

    const subCategories = await SubCategory.find()
      .select(["name", "parentCategory"])
      .lean();

    const categoriesWithSub = categories.map((cat) => ({
      ...cat,
      subCategories: subCategories.filter(
        (sub) => String(sub.parentCategory) === String(cat._id)
      ),
    }));

    res.status(200).json({
      success: true,
      data: categoriesWithSub,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Get Category by Slug (Admin)
const getCategoryBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug }).select([
      "name",
      "description",
      "metaTitle",
      "metaDescription",
      "cover",
      "module",
      "slug",
    ]);

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category Not Found",
      });
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//  Update Category by Slug (Admin)
const updateCategoryBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const { cover, ...others } = req.body;
    await Category.findOneAndUpdate(
      { slug },
      {
        ...others,
        cover: {
          ...cover,
        },
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: "Category Updated" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Delete Category by Slug (Admin)
const deleteCategoryBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOneAndDelete({ slug });

    for (const subCatId of category.subCategories) {
      const childCategories = await ChildCategory.find({
        subCategory: subCatId,
      });
      const childCategoryIds = childCategories.map((c) => c._id);

      await Product.deleteMany({ childCategory: { $in: childCategoryIds } });

      await ChildCategory.deleteMany({ subCategory: subCatId });
    }

    await Product.deleteMany({ subCategory: { $in: category.subCategories } });

    await SubCategory.deleteMany({ _id: { $in: category.subCategories } });

    await Product.deleteMany({ category: category._id });
    if (category && category.cover) {
      await singleFileDelete(req, category.cover._id);
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category Not Found",
      });
    }

    res
      .status(204)
      .json({ success: true, message: "Category Deleted Successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCategoryByAdmin,
  getCategoriesByAdmin,
  getCategoriesByAdminforChild,
  getCategoryBySlugByAdmin,
  updateCategoryBySlugByAdmin,
  deleteCategoryBySlugByAdmin,
};
