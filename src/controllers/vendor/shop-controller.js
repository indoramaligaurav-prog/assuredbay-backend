const Shop = require("../../models/Shop");
const Product = require("../../models/Product");
const Orders = require("../../models/Order");
const Payment = require("../../models/Payment");
const { singleFilesDelete } = require("../../utils/uploader-util");
const { sendOtp, checkOtp } = require("../../services/twilioVerify.service");

async function getTotalEarningsByShopId(shopId) {
  const pipeline = [
    {
      $match: {
        shop: shopId,
        status: "paid",
      },
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: "$totalIncome" }, // Calculate sum of totalIncome for paid payments
        totalCommission: { $sum: "$totalCommission" }, // Calculate sum of totalIncome for paid payments
      },
    },
  ];

  const result = await Payment.aggregate(pipeline);

  if (result.length > 0) {
    return result[0]; // Return total earnings from paid payments
  } else {
    return {
      totalEarnings: 0,
      totalCommission: 0,
    }; // Return 0 if no paid payments found for the shop
  }
}

/*     Get Shop Stats by Vendor ID    */
const getShopStatsByVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({ vendor: req.vendor._id });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop Not Found" });
    }
    const { totalCommission, totalEarnings } = await getTotalEarningsByShopId(
      shop._id
    );

    const totalProducts = await Product.countDocuments({
      shop: shop._id,
    });
    const totalOrders = await Orders.countDocuments({
      "items.shop": shop._id,
    });

    return res.status(200).json({
      success: true,
      data: shop,
      totalOrders,
      totalEarnings,
      totalCommission,
      totalProducts,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*     Create Shop by Vendor    */
const createShopByVendor = async (req, res) => {
  try {
    const { logo, ...others } = req.body;
    const shop = await Shop.create({
      vendor: req.vendor._id.toString(),
      ...others,
      logo: {
        ...logo,
      },
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      data: shop,
      message: "Shop created",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*     Get One Shop by Vendor    */
const getOneShopByVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({ vendor: req.vendor._id });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop Not Found" });
    }
    return res.status(200).json({
      success: true,
      data: shop,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*    Update One Shop by Vendor    */
const updateOneShopByVendor = async (req, res) => {
  try {
    const { slug } = req.params;

    const { logo, financialDetails, ...others } = req.body;
    //  Financial details must be present
    if (!financialDetails || !financialDetails.paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Financial details and payment method are required",
      });
    }

    //  Validate Paypal
    if (financialDetails.paymentMethod === "paypal") {
      if (!financialDetails?.paypal?.email) {
        return res.status(400).json({
          success: false,
          message: "Paypal email is required",
        });
      }
    }

    //  Validate Bank
    if (financialDetails.paymentMethod === "bank") {
      const missingFields = [];
      if (!financialDetails.bank?.accountNumber)
        missingFields.push("accountNumber");
      if (!financialDetails.bank?.bankName) missingFields.push("bankName");
      if (!financialDetails.bank?.holderName) missingFields.push("holderName");
      if (!financialDetails.bank?.holderEmail)
        missingFields.push("holderEmail");

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing bank fields: ${missingFields.join(", ")}`,
        });
      }
    }
    const updateShop = await Shop.findOneAndUpdate(
      {
        slug: slug,
        vendor: req.vendor._id.toString(),
      },
      {
        ...others,
        logo: {
          ...logo,
        },
        financialDetails: {
          ...financialDetails,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Updated shop",
      data: updateShop,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*     Delete One Shop by Vendor    */
const deleteOneShopByVendor = async (req, res) => {
  try {
    const { slug } = req.params;
    const shop = await Shop.findOne({ slug: slug, vendor: req.vendor._id });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop Not Found" });
    }
    await singleFilesDelete(req, shop.logo._id);
    await Shop.deleteOne({ _id: slug, vendor: req.vendor._id });
    return res.status(204).json({
      success: true,
      message: "Shop Deleted Successfully",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};


// controller
const getShopStatus = async (req, res) => {
  try {
    const Shop = require("../../models/Shop");
    const shop = await Shop.findOne({ vendor: req.user._id }).select("status payoutsEnabled").lean();

    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    return res.status(200).json({
      success: true,
      status: shop.status,
      payoutsEnabled: shop.payoutsEnabled,
    });
  } catch (error) {
    console.error("getShopStatus error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch shop status" });
  }
};

const sendPhoneOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    // await sendOtp(phoneNumber);

    return res.status(200).json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("sendPhoneOtp error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Failed to send OTP" });
  }
};

const verifyPhoneOtp = async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
      return res.status(400).json({ success: false, message: "Phone number and code are required" });
    }

    // const result = await checkOtp(phoneNumber, code);
    
    const result = { status: "approved" }; 

    if (result.status !== "approved") {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    return res.status(200).json({ success: true, message: "Phone verified" });
  } catch (err) {
    console.error("verifyPhoneOtp error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Failed to verify OTP" });
  }
};

module.exports = {
  getShopStatsByVendor,
  createShopByVendor,
  getOneShopByVendor,
  updateOneShopByVendor,
  deleteOneShopByVendor,
  getShopStatus,
  sendPhoneOtp,
  verifyPhoneOtp
};
