const Brands = require("../../models/Brand");
const Products = require("../../models/Product");

/*  Get all public brands */
const getBrands = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "" } = req.query;

    const limitNumber = parseInt(limit);
    const pageNumber = parseInt(page);
    const skip = limitNumber * (pageNumber - 1);

    const searchQuery = {
      status: "active",
      name: { $regex: search, $options: "i" },
    };

    const totalCount = await Brands.countDocuments(searchQuery);

    const brands = await Brands.find(searchQuery)
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 });

    const brandsWithProductCount = await Promise.all(
      brands.map(async (brand) => {
        const totalProducts = await Products.countDocuments({
          brand: brand._id,
        });
        return {
          ...brand.toObject(),
          totalProducts,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: brandsWithProductCount,
      totalCount,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalCount / limitNumber),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
/*  Get all public brands slugs */
const getBrandsSlugs = async (req, res) => {
  try {
    const brands = await Brands.find().select("slug").sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      data: brands,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const getBrandBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const brand = await Brands.findOne({ slug });

    if (!brand) {
      return res
        .status(404)
        .json({ success: false, message: "Brand Not Found" });
    }

    res.status(200).json({
      success: true,
      data: brand,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
module.exports = {
  getBrands,
  getBrandBySlug,
  getBrandsSlugs,
};
