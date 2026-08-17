const { getVendor: getVendorHelper } = require("../utils/getUser-util");

const getVendor = async (req, res, next) => {
  try {
    const vendor = await getVendorHelper(req);
    req.vendor = vendor;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.message || "Access Denied",
    });
  }
};

module.exports = { getVendor };
