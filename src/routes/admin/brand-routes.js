const express = require("express");
const router = express.Router();
const brand = require("../../controllers/admin/brand-controller");
const upload = require("../../middlewares/upload"); // multer
const checkPermission = require("../../middlewares/checkPermission");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.post("/admin/brands", verifyToken, getAdmin, upload.any(), brand.createBrandByAdmin);

router.get("/admin/brands", verifyToken, getAdmin,checkPermission("brands.view"), brand.getBrandsByAdmin);

router.get(
  "/admin/brands/:slug",
  verifyToken,
  getAdmin,
  checkPermission("brands.view"),
  brand.getBrandBySlugByAdmin
);

router.put(
  "/admin/brands/:slug",
  verifyToken,
  getAdmin,
  upload.any(),     
  brand.updateBrandBySlugByAdmin
);

router.delete(
  "/admin/brands/:slug",
  verifyToken,
  getAdmin,
  brand.deleteBrandBySlugByAdmin
);

router.get("/admin/all-brands", brand.getAllBrandsByAdmin);

module.exports = router;
