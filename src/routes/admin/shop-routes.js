const express = require("express");
const router = express.Router();
const shop = require("../../controllers/admin/shop-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.get("/admin/shops", verifyToken, getAdmin, shop.getShopsByAdmin);
router.get("/admin/shops/:slug", verifyToken, getAdmin, shop.getOneShopByAdmin);
router.put(
  "/admin/shops/:slug",
  verifyToken,
  getAdmin,
  shop.updateOneShopByAdmin
);
router.put(
  "/admin/shops/status/:slug",
  verifyToken,
  getAdmin,
  shop.updateShopStatusByAdmin
);
router.delete(
  "/admin/shops/:slug",
  verifyToken,
  getAdmin,
  shop.deleteOneShopByAdmin
);
router.get("/admin/all-shops", shop.getAllShopsByAdmin);

router.put(
  "/admin/shops/:slug/status",
  verifyToken,
  getAdmin,
  shop.updateshopstatus
);

router.patch(
  "/admin/shops/:slug/flags",
  verifyToken,
  getAdmin,
  shop.updateShopFlags
);

module.exports = router;
