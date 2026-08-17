const multer = require("multer");
const path = require("path");
const fs = require("fs");
const AWS = require("aws-sdk");
const multerS3 = require("multer-s3");

const useS3 = process.env.STORAGE_DRIVER === "s3";

let upload;

if (useS3) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
  });

  const s3 = new AWS.S3();

  upload = multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_BUCKET,
      acl: "public-read",
      key: (req, file, cb) => {
        let folder = "shops";

        if (req.originalUrl.includes("upload/slider")) {
          folder = "slides";
        }
        else if (req.originalUrl.includes("addproduct") || req.originalUrl.includes("updateproduct")) {
          folder = "products";
        }
        else if (req.originalUrl.includes("category")) {
          folder = "categories";
        }
        else if (req.originalUrl.includes("/admin/brands/{slug}")) {   
          folder = "brands";
        }


        cb(
          null,
          `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`
        );
      }
    })
  });

} else {

  // 🔒 YOUR EXACT OLD LOCAL LOGIC — UNTOUCHED
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
     let uploadPath = "uploads/shops";

      if (req.originalUrl.includes("upload/slider")) {
        uploadPath = "uploads/slides";
      }
      else if (req.originalUrl.includes("addproduct") || req.originalUrl.includes("updateproduct")) {
        uploadPath = "uploads/products";
      }
      else if (req.originalUrl.includes("category")) {
        uploadPath = "uploads/categories";
      }
      else if (req.originalUrl.includes("/admin/brands")) {  // 🔥 ADD THIS
        uploadPath = "uploads/brands";
      }


      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

      cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
    }
  });

  upload = multer({ storage });
}

module.exports = upload;
