const express = require("express");
const router = express.Router();
const childCategory = require("../../controllers/user/child-category-controller");

router.get("/child-categories", childCategory.getChildCategories);
router.get("/child-categories/all", childCategory.getAllChildCategories);
router.get("/child-categories/:slug", childCategory.getChildCategoryBySlug);
router.get("/child-categories-slugs", childCategory.getChildCategoriesSlugs);

module.exports = router;
