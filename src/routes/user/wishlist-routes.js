const express = require("express");
const router = express.Router();
const wishlist = require("../../controllers/user/wishlist-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getUser } = require("../../middlewares/getUser-middleware");

router.get("/wishlist", wishlist.getWishlist);
router.post("/wishlist",  wishlist.createWishlist);

module.exports = router;
