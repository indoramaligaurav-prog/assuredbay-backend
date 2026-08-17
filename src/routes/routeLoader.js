const express = require("express");
//////////////// admin routes //////////////////////
const adminAttributeRoutes = require("./admin/attribute-routes");
const adminBrandRoutes = require("./admin/brand-routes");
const adminCategoryRoutes = require("./admin/category-routes");
const adminChildCategoryRoutes = require("./admin/child-category-routes");
const adminCouponCodeRoutes = require("./admin/coupon-code-routes");
const adminCurrencyRoutes = require("./admin/currency-routes");
const adminDashboardRoutes = require("./admin/dashboard-routes");
const adminNewsletterRoutes = require("./admin/newsletter-routes");
const adminProductRoutes = require("./admin/product-routes");
const adminRoutes = require("./admin/user-routes");
const adminShopRoutes = require("./admin/shop-routes");
const adminReviewRoutes = require("./admin/review-routes");
const adminPaymentRoutes = require("./admin/payment-routes");
const adminSubCategoryRoutes = require("./admin/sub-category-routes");
const adminSettingsRoutes = require("./admin/setting-routes");
const adminPolicyRoutes = require("./admin/policy-routes");
const adminOrderRoutes = require("./admin/order-routes");
const adminCustomRoutes = require("./admin/admincustom-routes");
const adminsupportRoutes = require("./admin/support.routes");
//////////////// user routes ///////////////////////
const userAttributeRoutes = require("./user/attribute-routes");
const authRoutes = require("./user/auth-routes");
const homeRoutes = require("./user/home-routes");
const userBrandRoutes = require("./user/brand-routes");
const userCategoryRoutes = require("./user/category-routes");
const userChildCategoryRoutes = require("./user/child-category-routes");
const userCouponCodeRoutes = require("./user/coupon-code-routes");
const userCurrencyRoutes = require("./user/currency-routes");
const delete_fileRoutes = require("./user/file-delete-routes");
const userNewsletterRoutes = require("./user/newsletter-routes");
const searchRoutes = require("./user/search-routes");
const payment = require("./user/payment-intents-routes");
const userProductRoutes = require("./user/product-routes");
const userRoutes = require("./user/user-routes");
const wishlistRoutes = require("./user/wishlist-routes");
const userShopRoutes = require("./user/shop-routes");
const userReviewRoutes = require("./user/review-routes");
const userSubCategoryRoutes = require("./user/sub-category-routes");
const userSettingRoutes = require("./user/setting-routes");
const userPolicyRoutes = require("./user/policy-routes");
const userContactRoutes = require("./user/contact-routes");
const userOrderRoutes = require("./user/order-routes");
const usercustomRoutes = require("./user/custom-routes");
const usersupportRoutes = require("./user/support.routes");

/////////////// vendor routes //////////////////////
const vendorDashboardRoutes = require("./vendor/dashboard-routes");
const vendorProductRoutes = require("./vendor/product-routes");
const vendorShopRoutes = require("./vendor/shop-routes");
const vendorPaymentRoutes = require("./vendor/payment-routes");
const vendorOrderRoutes = require("./vendor/order-routes");
const CourierRoutes = require("./vendor/courier-routes");
const vendorShipmentRoutes  = require("./vendor/shipment.routes"); // ← new
const vendorSupportRoutes = require("./vendor/support.routes");
const router = express.Router();

//////////////// admin routes //////////////////////
router.use("/api", adminAttributeRoutes);
router.use("/api", adminBrandRoutes);
router.use("/api", adminCategoryRoutes);
router.use("/api", adminChildCategoryRoutes);
router.use("/api", adminCouponCodeRoutes);
router.use("/api", adminCurrencyRoutes);
router.use("/api", adminDashboardRoutes);
router.use("/api", adminNewsletterRoutes);
router.use("/api", adminProductRoutes);
router.use("/api", adminRoutes);
router.use("/api", adminShopRoutes);
router.use("/api", adminReviewRoutes);
router.use("/api", adminPaymentRoutes);
router.use("/api", adminSubCategoryRoutes);
router.use("/api", adminSettingsRoutes);
router.use("/api", adminOrderRoutes);
router.use("/api", adminPolicyRoutes);
router.use("/api", adminCustomRoutes);
router.use("/api", adminsupportRoutes);
//////////////// user routes ///////////////////////
router.use("/api", userAttributeRoutes);
router.use("/api", authRoutes);
router.use("/api", homeRoutes);
router.use("/api", userBrandRoutes);
router.use("/api", userCategoryRoutes);
router.use("/api", userChildCategoryRoutes);
router.use("/api", userCouponCodeRoutes);
router.use("/api", userCurrencyRoutes);
router.use("/api", userNewsletterRoutes);
router.use("/api", delete_fileRoutes);
router.use("/api", searchRoutes);
router.use("/api", payment);
router.use("/api", userProductRoutes);
router.use("/api", userRoutes);
router.use("/api", wishlistRoutes);
router.use("/api", userShopRoutes);
router.use("/api", userReviewRoutes);
router.use("/api", userSubCategoryRoutes);
router.use("/api", userSettingRoutes);
router.use("/api", userOrderRoutes);
router.use("/api", userPolicyRoutes);
router.use("/api", userContactRoutes);

router.use("/api",usercustomRoutes);
router.use("/api",usersupportRoutes);

/////////////// vendor routes //////////////////////
router.use("/api", vendorDashboardRoutes);
router.use("/api", vendorProductRoutes);
router.use("/api", vendorShopRoutes);
router.use("/api", vendorPaymentRoutes);
router.use("/api", vendorOrderRoutes);
router.use("/api", vendorShipmentRoutes); // ← new
router.use("/api", CourierRoutes);
router.use("/api", vendorSupportRoutes);

module.exports = router;
