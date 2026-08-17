const express = require("express");
const router = express.Router();
const deleteFileController = require("../../controllers/user/file-delete-controller");
router.delete("/delete-file/:id", deleteFileController.deleteFile);

module.exports = router;
