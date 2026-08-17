// middlewares/checkPermission.js
const User = require("../models/User");

const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).populate({
        path: "adminRole",
        populate: { path: "permissions" },
      });

      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }

      if (user.role === "super-admin") return next(); // ✅ from DB, not token

      const hasPermission = user.adminRole?.permissions?.some(
        (p) => p.key === permissionKey
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `You don't have permission to perform this action (${permissionKey})`,
        });
      }

      next();
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };
};

module.exports = checkPermission;