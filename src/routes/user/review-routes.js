const express = require("express");
const router = express.Router();
const review = require("../../controllers/user/review-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getUser } = require("../../middlewares/getUser-middleware");

router.get("/reviews/:pid", review.getReviewsbyPid);
router.post("/reviews", verifyToken, getUser, review.createReview);

module.exports = router;
