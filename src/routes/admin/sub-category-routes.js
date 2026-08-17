const express = require("express");
const router = express.Router();
const subCategory = require("../../controllers/admin/sub-category-controller");

const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");
const checkPermission = require("../../middlewares/checkPermission");

router.post(
  "/admin/sub-categories",
  verifyToken,
  getAdmin,
  subCategory.createSubCategoryByAdmin
);
router.get(
  "/admin/sub-categories",
  verifyToken,
  getAdmin,
  checkPermission("categories.view"),
  subCategory.getSubCategoriesByAdmin
);
router.get(
  "/admin/sub-categories/:slug",
  verifyToken,
  getAdmin,
  checkPermission("categories.view"),
  subCategory.getSubCategoryBySlugByAdmin
);
router.put(
  "/admin/sub-categories/:slug",
  verifyToken,
  getAdmin,
  subCategory.updateSubCategoryBySlugByAdmin
);
router.delete(
  "/admin/sub-categories/:slug",
  verifyToken,
  getAdmin,
  subCategory.deleteSubCategoryBySlugByAdmin
);
router.get("/admin/sub-categories/all", subCategory.getAllSubCategoriesByAdmin);

module.exports = router;
