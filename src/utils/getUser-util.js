const Users = require("../models/User");

exports.getUser = async (req, requireVerify = true) => {
  if (!req.user) {
    throw new Error("You Must Be Logged In.");
  }

  const user = await Users.findById(req.user._id);
  if (!user) {
    throw new Error("User Not Found.");
  }

  // If verification is required and user is not verified
  if (requireVerify && !user.isVerified) {
    throw new Error("User Email Is Not Verified.");
  }

  return user;
};

exports.getAdmin = async (req) => {
  if (!req.user) {
    throw new Error("You Must Be Logged In.");
  }

  const user = await Users.findById(req.user._id);
  if (!user) {
    throw new Error("User Not Found.");
  }
  if (!user.role.includes("admin")) {
    throw new Error("Access Denied.");
  }

  return user;
};

exports.getVendor = async (req) => {
  if (!req.user) {
    throw new Error("You Must Be Logged In.");
  }

  const user = await Users.findById(req.user._id);
  if (!user) {
    throw new Error("User Not Found.");
  }
  if (!user.role.includes("vendor")) {
    throw new Error("Access Denied.");
  }

  const Shop = require("../models/Shop");
  const shop = await Shop.findOne({ vendor: user._id }).lean();

  if (!shop) {
    throw new Error("Shop Not Found.");
  }

  if (shop.status !== "approved") {
    throw new Error("Your shop is pending approval. Please complete payment setup or wait for approval.");
  }

  return user;
};
