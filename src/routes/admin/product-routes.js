const express = require("express");
const router = express.Router();
const product = require("../../controllers/admin/product-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.post(
  "/admin/products",
  verifyToken,
  getAdmin,
  product.createProductByAdmin
);
router.get(
  "/admin/products",
  verifyToken,
  getAdmin,
  product.getProductsByAdmin
);
router.get(
  "/admin/products/:slug",
  verifyToken,
  getAdmin,
  product.getOneProductByAdmin
);
router.put(
  "/admin/products/:slug",
  verifyToken,
  getAdmin,
  product.updateProductByAdmin
);
router.delete(
  "/admin/products/:slug",
  verifyToken,
  getAdmin,
  product.deletedProductByAdmin
);


router.get(
  "/admin/products/status/draft",
  verifyToken,
  getAdmin,
  product.getAllDraftProductsByAdmin
);

router.put(
  "/admin/products/:slug/approve",
  verifyToken,
  getAdmin,
  product.approveProductByAdmin
);

router.put(
  "/admin/products/:slug/reject",
  verifyToken,
  getAdmin,
  product.rejectProductByAdmin
);

module.exports = router;
