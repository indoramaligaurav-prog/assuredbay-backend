const express = require("express");
const router = express.Router();
const newsletter = require("../../controllers/admin/newsletter-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.get(
  "/admin/newsletter",
  verifyToken,
  getAdmin,
  newsletter.getNewslettersByAdmin
);

module.exports = router;
