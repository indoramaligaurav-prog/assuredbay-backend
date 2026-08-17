const express = require("express");
const router = express.Router();
const shop = require("../../controllers/user/shop-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getUser } = require("../../middlewares/getUser-middleware");

router.post("/shops", verifyToken, getUser, shop.createShopByUser);
router.get("/user/shop", verifyToken, getUser, shop.getShopByUser);
router.get("/shops", shop.getShops);
router.get("/all-shops", shop.getAllShops);
router.get("/shops/:slug", shop.getOneShopByUser);
router.get("/shops-slugs", shop.getShopsSlugs);
router.get("/shop-title/:slug", shop.getShopNameBySlug);
module.exports = router;
