const express = require("express");
const router = express.Router();

const wishlist = require("../../controllers/user/wishlist-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getUser } = require("../../middlewares/getUser-middleware");

router.get("/wishlist", verifyToken, getUser, wishlist.getWishlist);
router.post("/wishlist", verifyToken, getUser, wishlist.createWishlist);

module.exports = router;