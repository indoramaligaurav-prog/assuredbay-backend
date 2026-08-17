const express = require("express");
const router = express.Router();
const childCategory = require("../../controllers/admin/child-category-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");
const checkPermission = require("../../middlewares/checkPermission");

router.post(
  "/admin/child-categories",
  verifyToken,
  getAdmin,
  childCategory.createChildCategoryByAdmin
);
router.get(
  "/admin/child-categories",
  verifyToken,
  getAdmin,
  checkPermission("categories.view"),
  childCategory.getAllChildCategoriesByAdmin
);
router.get(
  "/admin/child-categories/:slug",
  verifyToken,
  getAdmin,
  checkPermission("categories.view"),
  childCategory.getChildCategoryBySlugByAdmin
);
router.put(
  "/admin/child-categories/:slug",
  verifyToken,
  getAdmin,
  childCategory.updateChildCategoryBySlugByAdmin
);
router.delete(
  "/admin/child-categories/:slug",
  verifyToken,
  getAdmin,
  childCategory.deleteChildCategoryBySlugByAdmin
);
router.get(
  "/admin/child-categories/all",
  verifyToken,
  childCategory.getChildCategoriesByAdmin
);

module.exports = router;
