const ChildCategory = require("../../models/ChildCategory");
const SubCategory = require("../../models/SubCategory");
const Category = require("../../models/Category");
const Product = require("../../models/Product");
const { singleFileDelete } = require("../../utils/uploader-util");

//  Create Child Category by Admin
const createChildCategoryByAdmin = async (req, res) => {
  try {
    const { cover, ...others } = req.body;

    const category = await ChildCategory.create({
      ...others,
      cover: {
        ...cover,
      },
    });
    await SubCategory.findByIdAndUpdate(others.subCategory, {
      $addToSet: {
        childCategories: category._id,
      },
    });

    res.status(201).json({ success: true, message: "Child Category Created" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Get All Child Categories by Admin
const getAllChildCategoriesByAdmin = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "", category, status } = req.query;
    const currentCategory = category
      ? await Category.findOne({ slug: category })
      : null;
    if (category && !currentCategory) {
      res.status(404).json({ success: false, message: "Category not found!" });
      return;
    }
    const skip = parseInt(limit) || 10;
    const query = {
      name: { $regex: search, $options: "i" },
      ...(currentCategory && { subCategory: currentCategory._id }),
    };

    if (status) {
      query.status = status;
    }
    const totalChildCategories = await ChildCategory.find(query);

    const childCategories = await ChildCategory.find(query, null, {
      skip: skip * (parseInt(page) - 1 || 0),
      limit: skip,
    })
      .populate({
        path: "subCategory",
        select: ["_id", "name", "cover", "slug", "parentCategory"],
        populate: {
          path: "parentCategory",
          select: ["_id", "name", "cover", "slug"],
        },
      })
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      data: childCategories,
      count: Math.ceil(totalChildCategories.length / skip),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Get Child Category by Slug (Admin)
const getChildCategoryBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const childCategory = await ChildCategory.findOne({ slug }).populate({
      path: "subCategory",
      select: ["name", "parentCategory"],
      populate: {
        path: "parentCategory",
        select: ["name"],
      },
    });
   const categories = await Category.find().select(["name"]).lean();
const subCategories = await SubCategory.find().select(["name", "parentCategory"]).lean();

const categoriesWithSub = categories.map((cat) => ({
  ...cat,
  subCategories: subCategories.filter(
    (sub) => String(sub.parentCategory) === String(cat._id)
  ),
}));

    if (!childCategory) {
      return res.status(400).json({
        success: false,
        message: "ChildCategory Not Found",
      });
    }

res.status(200).json({ success: true, data: childCategory, categories: categoriesWithSub });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//  Update Child Category by Slug (Admin)
const updateChildCategoryBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const { cover, ...others } = req.body;

    const currentCategory = await ChildCategory.findOne({ slug });

    if (!currentCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Child Category not found" });
    }

    const updatedCategory = await ChildCategory.findOneAndUpdate(
      { slug },
      {
        ...others,
        cover: {
          ...cover,
        },
      },
      { new: true, runValidators: true }
    );

    if (String(currentCategory.subCategory) !== String(others.subCategory)) {
      await SubCategory.findByIdAndUpdate(currentCategory.subCategory, {
        $pull: { childCategories: currentCategory._id },
      });

      await SubCategory.findByIdAndUpdate(others.subCategory, {
        $addToSet: { childCategories: updatedCategory._id },
      });
    }

    res.status(200).json({
      success: true,
      message: "Child Category Updated",
      currentCategory: updatedCategory,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Delete Child Category by Slug (Admin)
const deleteChildCategoryBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;

    const childCategory = await ChildCategory.findOneAndDelete({ slug });
    if (!childCategory) {
      return res.status(400).json({
        success: false,
        message: "ChildCategory Not Found",
      });
    }

    await Product.deleteMany({ childCategory: childCategory._id });
    await singleFileDelete(req, childCategory.cover._id);
    await SubCategory.findByIdAndUpdate(childCategory.subCategory, {
      $pull: { childCategories: childCategory._id },
    });

    res.status(204).json({
      success: true,
      message: "ChildCategory Deleted Successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getChildCategoriesByAdmin = async (req, res) => {
  try {
    const categories = await ChildCategory.find().sort({
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

module.exports = {
  createChildCategoryByAdmin,
  updateChildCategoryBySlugByAdmin,
  deleteChildCategoryBySlugByAdmin,
  getChildCategoriesByAdmin,
  getChildCategoryBySlugByAdmin,
  getAllChildCategoriesByAdmin,
};
