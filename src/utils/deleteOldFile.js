const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");

const useS3 = process.env.STORAGE_DRIVER === "s3";
const s3 = useS3 ? new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
}) : null;

async function deleteOldFile(fileUrl) {
  if (!fileUrl) return;

  if (useS3) {
    try {
      const url = new URL(fileUrl);
      const key = url.pathname.replace(/^\//, "");
      await s3.deleteObject({ Bucket: process.env.AWS_BUCKET, Key: key }).promise();
    } catch (err) {
      console.error("Failed to delete old S3 file:", fileUrl, err.message);
    }
  } else {
    try {
      const filePath = path.join(process.cwd(), fileUrl.replace(/^\//, ""));
      fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error("Failed to delete old local file:", filePath, err.message);
        }
      });
    } catch (err) {
      console.error("Failed to delete old local file:", fileUrl, err.message);
    }
  }
}

module.exports = { deleteOldFile };