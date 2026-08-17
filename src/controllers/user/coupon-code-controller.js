const CouponCode = require("../../models/CouponCode");

/*  Get Coupon Code by Code */
const getCouponCodeByCode = async (req, res) => {
  try {
    const code = req.params.code;
    const getCouponCode = await CouponCode.findOne({ code: code });

    if (!getCouponCode) {
      return res.status(404).json({
        success: false,
        message: "Coupon Code Not Found",
      });
    }


if (new Date(getCouponCode.expire) < new Date()) {
  return res.status(400).json({
    success: false,
    message: 'Coupon code has expired'
  });
}

    return res.status(200).json({
      success: true,
      data: getCouponCode,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*  Get Coupon Code by ID */
const getCouponCodeById = async (req, res) => {
  try {
    const id = req.params.id;
    const getCouponCode = await CouponCode.findById(id);

    if (!getCouponCode) {
      return res.status(404).json({
        success: false,
        message: "Coupon Code Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      data: getCouponCode,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCouponCodeByCode,
  getCouponCodeById,
};
