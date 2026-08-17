const express = require("express");
const router = express.Router();
const product = require("../../controllers/user/product-controller");

router.get("/products", product.getProducts);
router.get("/products/filters", product.getFilters);
router.get("/filters/:shop", product.getFiltersByShop);
router.get("/filters/:shop/:category", product.getFiltersByCategory);
router.get(
  "/filters/:shop/:category/:subcategory",
  product.getFiltersBySubCategory
);
router.get("/products/:slug", product.getOneProductBySlug);
router.get("/products-slugs", product.getAllProductSlug);
router.get("/related-products/:pid", product.relatedProducts);
router.post("/compare/products", product.getCompareProducts);

module.exports = router;
