const express = require("express");
const router = express.Router();
const user = require("../../controllers/user/user-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getUser } = require("../../middlewares/getUser-middleware");

router.get("/users/profile", verifyToken, getUser, user.getOneUser);
router.put("/users/profile", verifyToken, getUser, user.updateUser);
router.get("/users/invoice", verifyToken, getUser, user.getInvoice);
router.put("/users/change-password", verifyToken, getUser, user.changePassword);

router.get("/users/otp", user.getOTPs);

module.exports = router;
