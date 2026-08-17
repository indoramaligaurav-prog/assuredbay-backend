const Brand = require("../../models/Brand");
const Product = require("../../models/Product");
const { singleFileDelete } = require("../../utils/uploader-util");

/*  Create a new brand by admin */
const createBrandByAdmin = async (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || [];

    let logo = null;

    if (files.length > 0) {
      const file = files[0];

      if (process.env.STORAGE_DRIVER === "s3") {
        logo = {
          url: file.location,
          key: file.key,
        };
      } else {
        const folder = file.destination.replace(/\\/g, "/");
        logo = {
          url: `/${folder}/${file.filename}`,
          key: file.filename,
        };
      }
    }

    const newBrand = await Brand.create({
      ...body,
      ...(logo && { logo }),
      totalItems: 0,
    });

    res.status(201).json({
      success: true,
      data: newBrand,
      message: "Brand Created",
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*  Get all brands created by admin */
const getAllBrandsByAdmin = async (req, res) => {
  try {
    const brands = await Brand.find().sort({
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

/*  Get brand details by slug (admin only) */
const getBrandBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const brand = await Brand.findOne({ slug });

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

/*  Update brand details by slug (admin only) */
const updateBrandBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;

    // multer parses FormData for you
    const body = req.body;        // text fields
    const files = req.files || []; // uploaded files array

   

    let logo = null;

    if (files.length > 0) {
      const file = files[0];   // logo file

      if (process.env.STORAGE_DRIVER === "s3") {
          logo = {
            url: file.location,
            key: file.key
          };
        } else {
          const folder = file.destination.replace(/^uploads\//, '');
          logo = {
              url: `/${file.destination}/${file.filename}`.replace(/\\/g, '/'),
            key: file.filename
          };
        }

    }

    const updateData = {
      ...body,
      ...(logo && { logo })
    };
    console.log("Updated Brand =>", updateData);
    const brand = await Brand.findOneAndUpdate(
      { slug },
      updateData,
      { new: true }
    );

    res.json({ success: true, data: updateData, message: "Brand Updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/*  Delete brand by slug (admin only) */
const deleteBrandBySlugByAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    const brand = await Brand.findOne({ slug });

    if (!brand) {
      return res
        .status(404)
        .json({ success: false, message: "Brand Not Found" });
    }

    await Product.deleteMany({ brand: brand._id });

    await singleFileDelete(req, brand?.logo?._id);

    await Product.deleteMany({ brand: brand._id });
    res.status(204).json({
      success: true,
      message: "Brand and linked products deleted successfully.",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/*  Get all brands created by admin */
const getBrandsByAdmin = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "", status } = req.query;
    const skip = parseInt(limit) * (parseInt(page) - 1) || 0;
    const query = {
      name: { $regex: search, $options: "i" },
    };

    if (status) {
        query.status = { $regex: `^${status}$`, $options: "i" };
    }
    
    const totalBrands = await Brand.find(query);
    const brands = await Brand.find(query, null, {
      skip: skip,
      limit: parseInt(limit),
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: brands,
      count: Math.ceil(totalBrands.length / skip),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBrandByAdmin,
  getBrandBySlugByAdmin,
  updateBrandBySlugByAdmin,
  deleteBrandBySlugByAdmin,
  getBrandsByAdmin,
  getAllBrandsByAdmin,
};
