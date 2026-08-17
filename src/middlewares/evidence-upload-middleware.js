const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Mirrors the /uploads/products/... pattern your product images already use.
// If you already have a shared multer config elsewhere (e.g. for product/shop
// image uploads), swap this out for that instead - this is self-contained on
// purpose since I don't have your existing upload middleware to match.

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "support-evidence");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are accepted as evidence"), false);
  }
  cb(null, true);
};

const evidenceUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 6
  }
});

module.exports = evidenceUpload;