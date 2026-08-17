const express = require("express");
const router = express.Router();
const product = require("../../controllers/vendor/product-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");

router.post(
  "/vendor/products",
  verifyToken,
  getVendor,
  product.createProductByVendor
);
router.get(
  "/vendor/products",
  verifyToken,
  getVendor,
  product.getProductsByVendor
);
router.get(
  "/vendor/products/:slug",
  verifyToken,
  getVendor,
  product.getOneProductVendor
);
router.put(
  "/vendor/products/:slug",
  verifyToken,
  getVendor,
  product.updateProductByVendor
);
router.delete(
  "/vendor/products/:slug",
  verifyToken,
  getVendor,
  product.deleteProductByVendor
);

router.get(
  "/vendor/pickup-locations",
  verifyToken,
  getVendor,
  product.getPickupLocations
);

router.post(
  "/vendor/pickup-locations",
  verifyToken,
  getVendor,
  product.createPickupLocation
);

module.exports = router;
