const ProfileGrade = require("../../models/ProfileGrade");
const OrderItem = require("../../models/OrderItem");
const User = require("../../models/User");

exports.getMyTierByVendor = async (req, res) => {
  try {
    const [grades, completedOrders, me] = await Promise.all([
      ProfileGrade.find({ isActive: true }).sort({ priority: 1 }).lean(),
      OrderItem.countDocuments({ vendorId: req.user._id, vendorStatus: "delivered" }),
      User.findById(req.user._id).select("profileGrade").lean()
    ]);

    return res.json({
      success: true,
      completedOrders,
      currentId: me?.profileGrade || null,
      grades
    });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "Could not load tier" });
  }
};