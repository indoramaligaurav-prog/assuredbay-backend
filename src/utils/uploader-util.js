const { cloudinary, configureCloudinary } = require("../config/cloudinary");
function isLiveRequest(req) {
  const origin = req.headers.origin || req.headers.host;
  return origin && origin.includes("assuredbay-fe-staging.vercel.app");
}
const uploadOnCloudinary = async (file) => {
  const cloud = await configureCloudinary();
  return cloudinary.uploader.unsigned_upload(file, cloud.preset);
};

const deleteFromCloudinary = async (req, fileId) => {
  //  Prevent delete in demo/live mode
  if (isLiveRequest(req)) {
    throw new Error("Delete not allowed in demo/live mode.");
  }
  await configureCloudinary();
  return cloudinary.uploader.destroy(fileId);
};

//  Single file upload
exports.singleFileUploader = async (image) => {
  const result = await uploadOnCloudinary(image);
  return { _id: result.public_id, url: result.secure_url };
};

//  Multiple files upload
exports.multiFileUploader = async (images) => {
  const results = [];
  for (let i = 0; i < images.length; i++) {
    const result = await uploadOnCloudinary(images[i]);
    results.push({ _id: result.public_id, url: result.secure_url });
  }
  return results;
};

//  Single delete
exports.singleFileDelete = async (req, id) => {
  const result = await deleteFromCloudinary(req, id);
  return result;
};

//  Multiple delete
exports.multiFilesDelete = async (req, images) => {
  const results = [];
  for (let i = 0; i < images.length; i++) {
    const result = await deleteFromCloudinary(req, images[i]._id);
    results.push(result);
  }
  return results;
};
