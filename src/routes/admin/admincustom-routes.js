const express = require("express");
const router = express.Router();
const customcontroller = require("../../controllers/admin/custom-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");



module.exports = router;