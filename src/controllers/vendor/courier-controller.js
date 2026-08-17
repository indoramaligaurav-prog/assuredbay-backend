const CourierInfo = require("../../models/CourierInfo");
const Shop = require("../../models/Shop");

//  Create or Update Courier Info (Vendor)

const createCourierInfoByVendor = async (req, res) => {
  try {
    const { orderId, courierName, trackingId, trackingLink } = req.body;

    if (!orderId || !courierName || !trackingId || !trackingLink) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const shop = await Shop.findOne({ vendor: req.vendor._id });
    if (!shop) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized shop access" });
    }

    const existing = await CourierInfo.findOne({
      orderId,
      shopId: shop._id,
      vendorId: req.vendor._id,
    });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Courier info already exists" });
    }

    const courierInfo = await CourierInfo.create({
      vendorId: req.vendor._id,
      orderId,
      shopId: shop._id,
      courierName,
      trackingId,
      trackingLink,
    });
    return res.status(201).json({
      success: true,
      data: courierInfo,
      message: "Courier info created",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

//  Update Courier Info (Vendor)
const updateCourierInfoByVendor = async (req, res) => {
  try {
    const id = req.params.id;
    const { orderId, courierName, trackingId, trackingLink } = req.body;

    if (!orderId || !courierName || !trackingId || !trackingLink) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const shop = await Shop.findOne({ vendor: req.vendor._id });
    if (!shop) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized shop access" });
    }

    const courierInfo = await CourierInfo.findByIdAndUpdate(
      { _id: id, vendorId: req.vendor._id },
      { courierName, trackingId, trackingLink },
      { new: true }
    );
    if (!courierInfo) {
      return res
        .status(404)
        .json({ success: false, message: "Courier info not found" });
    }

    return res.status(200).json({
      success: true,
      data: courierInfo,
      message: "Courier info updated",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCourierInfoByVendor,
  updateCourierInfoByVendor,
};
