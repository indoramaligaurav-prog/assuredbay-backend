const express = require("express");
const router = express.Router();
const subCategory = require("../../controllers/user/sub-category-controller");

router.get("/sub-categories", subCategory.getSubCategories);
router.get("/sub-categories/all", subCategory.getAllSubCategories);
router.get("/sub-categories/:slug", subCategory.getSubCategoryBySlug);
router.get("/sub-categories-slugs", subCategory.getSubCategoriesSlugs);

module.exports = router;
