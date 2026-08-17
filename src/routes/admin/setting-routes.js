const express = require("express");
const settings = require("../../controllers/admin/setting-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");
const router = express.Router();

router.get(
  "/admin/settings/settings",
  verifyToken,
  getAdmin,
  settings.getSettings
);
router.get(
  "/admin/settings/main",
  verifyToken,
  getAdmin,
  settings.getMainSettings
);
router.get(
  "/admin/settings/general",
  verifyToken,
  getAdmin,
  settings.getGeneralSettings
);
router.get(
  "/admin/settings/home",
  verifyToken,
  getAdmin,
  settings.getHomeSettings
);
router.get(
  "/admin/settings/branding",
  verifyToken,
  getAdmin,
  settings.getBrandingSettings
);
router.put(
  "/admin/settings/main/:id",
  verifyToken,
  getAdmin,
  settings.updateMainSettings
);
router.put(
  "/admin/settings/general/:id",
  verifyToken,
  getAdmin,
  settings.updateGeneralSettings
);
router.put(
  "/admin/settings/home/:id",
  verifyToken,
  getAdmin,
  settings.updateHomeSettings
);
router.put(
  "/admin/settings/branding/:id",
  verifyToken,
  getAdmin,
  settings.updateBrandingSettings
);

router.post(
  "/admin/settings/settings",
  verifyToken,
  getAdmin,
  settings.createSettings
);

router.get(
  "/admin/settings/zone",
  verifyToken,
  getAdmin,
  settings.getZoneSettings
);

router.post("/admin/settings/zone", 
  verifyToken,
  getAdmin,settings.createZoneSettings);


  router.post("/admin/settings/returnpolicies", 
  verifyToken,
  getAdmin,settings.createReturnPolicy);
  
  
  router.post("/admin/settings/shippingpolicies", 
  verifyToken,
  getAdmin,settings.createShipping);

    
  router.post("/admin/settings/cancellationpolicies", 
  verifyToken,
  getAdmin,settings.createcancellationpolicies);
  
  
  // router.post("/admin/settings/returnpolicies", 
  // verifyToken,
  // getAdmin,settings.createCancelPolicy);
  

module.exports = router;
