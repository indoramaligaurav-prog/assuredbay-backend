const { getAdmin: getAdminHelper } = require("../utils/getUser-util");

const getAdmin = async (req, res, next) => {
  try {
    const admin = await getAdminHelper(req);
    req.admin = admin;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.message || "Access Denied",
    });
  }
};

module.exports = { getAdmin };
