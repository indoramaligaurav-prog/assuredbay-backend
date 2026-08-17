const express = require("express");
const router = express.Router();
const customcontroller = require("../../controllers/user/custom-controller");
const { getShippingRates } = require('../../controllers/user/fedexController');
const upload = require("../../middlewares/upload"); // multer
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");
const Category = require("../../models/Category");
const SubCategory = require("../../models/SubCategory");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");
const { deleteOldFile } = require("../../utils/deleteOldFile"); 

router.get("/user_zone/:id", customcontroller.checkzoneassign);

router.post("/user_zone", customcontroller.postuserzone);

router.post(
  "/shop/create",             // sets req.user
  upload.any(),      // handles logo + dynamic KYC docs
  customcontroller.postshops
);

router.get("/all-subcategories", customcontroller.all_subcategories);
router.get("/all-childcategories", customcontroller.all_childcategories);

router.get("/getallpoliciesforlisting", customcontroller.getallpoliciesforlisting);

router.post(
  '/vendor/addproduct',
  verifyToken,
  getVendor,
   upload.any(),       
  customcontroller.createProduct
);
// routes/pricing.js
router.post('/pricing/convert', customcontroller.convertPrice);

router.post(
  '/upload/category',
  upload.single('file'),
  async (req, res) => {
    try {
      const { categoryId, parentCategory } = req.body;

      if (!req.file || !categoryId) {
        return res.status(400).json({ message: 'Invalid upload request' });
      }

      let updatedDoc = null;

      // ✅ SUBCATEGORY (parentCategory exists)
      if (parentCategory) {
        updatedDoc = await SubCategory.findByIdAndUpdate(
          categoryId,
          {
            $set: {
              cover: {
                filename: req.file.filename,
                url: `/uploads/categories/${req.file.filename}`
              }
            }
          },
          { new: true }
        );

        console.log('Updated SubCategory cover:', updatedDoc?.cover);
      }
      // ✅ CATEGORY
      else {
        updatedDoc = await Category.findByIdAndUpdate(
          categoryId,
          {
            $set: {
              cover: {
                filename: req.file.filename,
                url: `/uploads/categories/${req.file.filename}`
              }
            }
          },
          { new: true }
        );

        console.log('Updated Category cover:', updatedDoc?.cover);
      }

      // ❌ HARD FAIL if update didn’t happen
      if (!updatedDoc?.cover) {
        return res.status(500).json({
          message: 'Image upload succeeded but DB update failed'
        });
      }

      res.json({
        message: 'File uploaded and updated successfully',
        filename: req.file.filename,
        url: `/uploads/categories/${req.file.filename}`,
        categoryId
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Upload failed' });
    }
  }
);

router.get(
  '/admin/product/:id',
  verifyToken,
  getAdmin,
  customcontroller.getProductById
);

router.put(
  '/admin/updateproduct/:id',
 verifyToken,
  getVendor,
  upload.any(),
  customcontroller.updateProduct
);

router.patch(
  '/admin/product/:id/status',
  customcontroller.updateProductStatus
);

router.post(
  '/admin/upload/slider',  
  verifyToken,
  getAdmin,
  upload.any(),
  customcontroller.uploadHomeSlider
);

router.get(
  '/getvendoridbyproduct/:productId',
  customcontroller.getVendorIdByProduct
);

router.get(
  '/shipping-policy/:id',
  customcontroller.getshippingpolicy
);

router.post(
  '/quote-request',
  customcontroller.createQuoteRequest
);

router.get(
  '/getqoutbyvendor/:id',
    customcontroller.getqoutbyvendor
);

router.get(
  '/getqoutbyuser/:id',
    customcontroller.getqoutbyuser
);

router.post(
  '/send-quote-message',
  customcontroller.sendQuotemessage
);

router.get('/quote-chat/:quoteId', customcontroller.getQuoteChat);

router.get(
  '/all-countries',
  customcontroller.getAllCountries
);

router.post(
  '/get-courier-rate',
  customcontroller.getCourierRate
);

router.get('/return-policy/:id',   customcontroller.getreturnpolicy);
router.get('/cancel-policy/:id',   customcontroller.getcancelpolicy);

router.get('/products/:slug/related', customcontroller.getRelatedProducts);

router.post('/fedex/rates', getShippingRates);



module.exports = router;