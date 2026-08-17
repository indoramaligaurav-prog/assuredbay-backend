const express = require("express");
const router = express.Router();
const Category = require("../../controllers/admin/category-controller");

const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");
const checkPermission = require("../../middlewares/checkPermission");

router.post(
  "/admin/categories",
  verifyToken,
  getAdmin,
  Category.createCategoryByAdmin
);
router.get(
  "/admin/categories",
  verifyToken,
  getAdmin,
  checkPermission("categories.view"),
  Category.getCategoriesByAdmin
);
router.get(
  "/admin/categories/:slug",
  verifyToken,
  getAdmin,
  checkPermission("categories.view"),
  Category.getCategoryBySlugByAdmin
);
router.put(
  "/admin/categories/:slug",
  verifyToken,
  getAdmin,
  Category.updateCategoryBySlugByAdmin
);
router.delete(
  "/admin/categories/:slug",
  verifyToken,
  getAdmin,
  Category.deleteCategoryBySlugByAdmin
);
// router.get("/admin/categories/all", verifyToken, adminCategory.getCategories);
router.get("/admin/all-categories", Category.getCategoriesByAdmin);

router.get("/all-categoriesforchild", Category.getCategoriesByAdminforChild);

module.exports = router;
