const express = require("express");
const router = express.Router();
const brand = require("../../controllers/user/brand-controller");

router.get("/brands", brand.getBrands);
router.get("/brands/:slug", brand.getBrandBySlug);
router.get("/brands-slugs", brand.getBrandsSlugs);

module.exports = router;
