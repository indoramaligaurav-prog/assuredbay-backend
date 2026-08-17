const User = require("../../models/User");
const Categories = require("../../models/Category");

//  Get All Header Categories
const getAllHeaderCategories = async (req, res) => {
  try {
    const userCount = await User.countDocuments({ status: "active" });

    const categories = await Categories.find({ status: "active" })
      .sort({
        createdAt: -1,
      })
      .select(["name", "slug", "subCategories"])
      .populate({ path: "subCategories", select: ["name", "slug"] });

    res.status(200).json({
      success: true,
      data: categories,
      ...(!userCount && {
        adminPopup: true,
      }),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Get All Categories (Public or Admin)
const getAllCategories = async (req, res) => {
  try {
    const categories = await Categories.aggregate([
      { $match: { status: "active" } },
      { $sort: { name: 1 } },

      {
        $lookup: {
          from: "subcategories",
          localField: "_id",
          foreignField: "parentCategory",
          as: "subCategories"
        }
      },
      {
        $lookup: {
          from: "childcategories",
          localField: "subCategories._id",
          foreignField: "subCategory",
          as: "allChildCategories"
        }
      },
      {
        $addFields: {
          subCategories: {
            $map: {
              input: {
                $sortArray: {
                  input: "$subCategories",
                  sortBy: { name: 1 }
                }
              },
              as: "sub",
              in: {
                $mergeObjects: [
                  "$$sub",
                  {
                    childCategories: {
                      $sortArray: {
                        input: {
                          $filter: {
                            input: "$allChildCategories",
                            as: "child",
                            cond: {
                              $eq: ["$$child.subCategory", "$$sub._id"]
                            }
                          }
                        },
                        sortBy: { name: 1 }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: { allChildCategories: 0 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

//  Get Category By Slug (Public)
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Categories.findOne({ slug })
      .select([
        "name",
        "description",
        "metaTitle",
        "metaDescription",
        "cover",
        "slug",
        "module",
      ])
      .populate({
        path: "subCategories",
        select: ["name", "slug", "cover"],
      });

    if (!category) {
      return res.status(404).json({
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

// Get All Categories (Public)
const getCategories = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "" } = req.query;

    const skip = parseInt(limit) || 10;
    const query = {
      name: { $regex: search, $options: "i" },
      status: "active",
    };
    const totalCategories = await Categories.find(query);

    const categories = await Categories.find(query, null, {
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

//  Get Only Slugs of All Active Categories
const getCategoriesSlugs = async (req, res) => {
  try {
    const categories = await Categories.find({ status: "active" }).select(
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

const suggestCategoryFromTitle = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "title is required" });
    }

    const STOPWORDS = new Set([
      "the", "and", "for", "with", "new", "pro", "max", "plus", "of", "in", "on", "a", "an", "to",
    ]);

    const titleWords = title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w));

    if (!titleWords.length) {
      return res.status(200).json({ success: true, data: { category: null } });
    }

    const categories = await Categories.find(
      { status: "active" },
      { name: 1 }
    ).lean();

    let bestMatch = null;
    let bestScore = 0;

    categories.forEach((cat) => {
      const catWords = cat.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

      let score = 0;
      catWords.forEach((cw) => {
        if (titleWords.includes(cw)) score += 1;
      });
      // Whole category name appearing in title is a stronger signal
      if (title.toLowerCase().includes(cat.name.toLowerCase())) {
        score += 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = cat;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        category: bestScore > 0 ? { _id: bestMatch._id, name: bestMatch.name } : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllHeaderCategories,
  getAllCategories,
  getCategoryBySlug,
  getCategories,
  getCategoriesSlugs,
  suggestCategoryFromTitle,
};
