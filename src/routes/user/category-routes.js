const express = require("express");
const router = express.Router();
const Category = require("../../controllers/user/category-controller");

router.get("/categories", Category.getCategories);
router.get("/header/all-categories", Category.getAllHeaderCategories);
router.get("/all-categories", Category.getAllCategories);
router.post("/suggest-category", Category.suggestCategoryFromTitle);
router.get("/categories-slugs", Category.getCategoriesSlugs);
router.get("/categories/:slug", Category.getCategoryBySlug);

module.exports = router;
