const express = require("express");
const router = express.Router();
const home = require("../../controllers/user/home-controller");
router.get("/home/categories", home.getCategories);
router.get("/home/products/top", home.getTopRatedProducts);
router.get("/home/products/best-selling", home.getBestSellerProducts);
router.get("/home/products/featured", home.getFeaturedProducts);
router.get("/home/brands", home.getBrands);
router.get("/home/reviews", home.getFeaturedReviews);
router.get("/home/home-banners", home.getHomeBanners);

module.exports = router;
