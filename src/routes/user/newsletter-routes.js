const express = require("express");
const router = express.Router();
const newsletter = require("../../controllers/user/newsletter-controller");

router.post("/newsletter", newsletter.createNewsletter);

module.exports = router;
