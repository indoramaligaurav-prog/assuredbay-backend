const express = require("express");
const router = express.Router();
const review = require("../../controllers/admin/review-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.get("/admin/reviews", verifyToken, getAdmin, review.getReviewsByAdmin);
router.post("/admin/review", verifyToken, getAdmin, review.createReviewByAdmin);

module.exports = router;
