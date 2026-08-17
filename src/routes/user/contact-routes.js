const express = require("express");
const router = express.Router();
const {
  createContactMessage,
} = require("../../controllers/user/contact-controller");

router.post("/contact", createContactMessage);

module.exports = router;
