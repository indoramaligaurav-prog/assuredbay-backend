const Settings = require("../../models/Settings");
const Zone = require("../../models/Zone");
const Country = require("../../models/Countries");
const Returnpolicy = require("../../models/returnpolicy");
const shippingmodel = require("../../models/shippingpolicy");
const cancelpolicy = require("../../models/cancelpolicies");

/*  Create General Settings */
const createSettings = async (req, res) => {
  try {
    const settings = await Settings.find();
    if (settings.length) {
      const updatedSettings = await Settings.findByIdAndUpdate(
        settings[0]._id,
        { $set: req.body },
        { new: true, runValidators: true }
      );

      if (!updatedSettings) {
        return res.status(404).json({
          success: false,
          message: "General Settings not found",
        });
      }

      return res.status(201).json({
        success: true,
        message: "Settings Updated",
      });
    }

    await Settings.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Settings Created",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || error,
    });
  }
};

/*  Get General Settings */
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "General Settings not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || error,
    });
  }
};

const getMainSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "General Settings not found",
      });
    }

    const { main, _id } = settings;
    const { gaId, gtmId, ...restMain } = main;

    return res.status(200).json({
      success: true,
      data: {
        ...restMain,
        gaId: gaId ? "********" : null,
        gtmId: gtmId ? "********" : null,
        _id,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || error,
    });
  }
};

const getGeneralSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "General Settings not found",
      });
    }

    const { general, _id } = settings;

    const {
      paypal = {},
      stripe = {},
      cloudinary = {},
      smtp = {},
      ...rest
    } = general;

    const maskValue = (val) => (val ? "********" : null);

    const maskedGeneral = {
      ...rest,
      paypal: {
        ...paypal,
        clientId: maskValue(paypal.clientId),
      },
      stripe: {
        ...stripe,
        publishableKey: maskValue(stripe.publishableKey),
        secretKey: maskValue(stripe.secretKey),
      },
      cloudinary: {
        ...cloudinary,
        cloudName: maskValue(cloudinary.cloudName),
        apiKey: maskValue(cloudinary.apiKey),
        apiSecret: maskValue(cloudinary.apiSecret),
        preset: maskValue(cloudinary.preset),
      },
      smtp: {
        ...smtp,
        host: maskValue(smtp.host),
        user: maskValue(smtp.user),
        password: maskValue(smtp.password),
        fromEmail: maskValue(smtp.fromEmail),
      },
    };

    return res.status(200).json({
      success: true,
      data: { ...maskedGeneral, _id },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || error,
    });
  }
};
const getHomeSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Home Settings not found",
      });
    }
    const { home, _id } = settings;
    return res.status(200).json({
      success: true,
      data: { ...home, _id },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || error,
    });
  }
};
const getBrandingSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Branding Settings not found",
      });
    }
    const { branding, _id } = settings;
    return res.status(200).json({
      success: true,
      data: { ...branding, _id },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || error,
    });
  }
};

const updateMainSettings = async (req, res) => {
  try {
    const body = req.body;
    const id = req.params.id;
    await Settings.findByIdAndUpdate(id, {
      main: { ...body },
    });

    return res.status(200).json({
      success: true,
      message: "Settings updated",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || error,
    });
  }
};

const updateGeneralSettings = async (req, res) => {
  try {
    const body = req.body;
    const id = req.params.id;
    await Settings.findByIdAndUpdate(id, {
      general: { ...body },
    });

    return res.status(200).json({
      success: true,
      message: "Settings updated",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || error,
    });
  }
};
const updateHomeSettings = async (req, res) => {
  try {
    const body = req.body;
    const id = req.params.id;
    await Settings.findByIdAndUpdate(id, {
      home: { ...body },
    });

    return res.status(200).json({
      success: true,
      message: "Settings updated",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || error,
    });
  }
};
const updateBrandingSettings = async (req, res) => {
  try {
    const body = req.body;
    const id = req.params.id;
    await Settings.findByIdAndUpdate(id, {
      branding: { ...body },
    });

    return res.status(200).json({
      success: true,
      message: "Settings updated",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || error,
    });
  }
};

const getZoneSettings = async (req, res) => {
  try {
    const [zones, countries] = await Promise.all([
      Zone.find().sort({ createdAt: -1 }),
      Country.find({})
        .select("code label")
        .sort({ label: 1 })
    ]);

    res.status(200).json({
      success: true,
      data: {
        zones,
        countries
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


const createZoneSettings = async (req, res) => {
  try {
    const { country_code, kyc_docs } = req.body;

    const zone = await Zone.findOneAndUpdate(
      { country_code },
      { country_code, kyc_docs },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "Zone saved successfully",
      data: zone
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// CREATE
const createReturnPolicy = async (req, res) => {
  try {
  
    const {
      name,
      return_allowed,
      return_window_days,
      return_shipping_payer,
      refund_mode,
      replacement_allowed,
      status
    } = req.body || {};

    if (!name) {
      return res.status(400).json({ message: "Policy name is required" });
    }

    const policy = await Returnpolicy.create({
      name,
      return_allowed,
      return_window_days,
      return_shipping_payer,
      refund_mode,
      replacement_allowed,
      status
    });

    res.status(201).json({ success: true, data: policy });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createShipping= async(req, res) =>
{
    try{
      const {
      name,
      shipping_scope,
      shipping_payer,
      handling_days,
      cod_allowed,
      status
    } = req.body || {};

    const shippolicy = await shippingmodel.create({
         name,
      shipping_scope,
      shipping_payer,
      handling_days,
      cod_allowed,
      status
    });

      res.status(201).json({ success: true, data: shippolicy });

    }catch(err)
    {
         res.status(500).json({ message: err.message });

    }



}

const createcancellationpolicies = async(req ,res) =>
{
    try{
      const {
        name,
        cancellation_allowed,
        cancel_before_hours,
        refund_mode,
        status
      } = req.body || {};

      const canceldata = await cancelpolicy.create({
           name,
        cancellation_allowed,
        cancel_before_hours,
        refund_mode,
        status
      });

       res.status(201).json({ success: true, data: canceldata });
    } 
    catch(err){
          res.status(500).json({ message: err.message });
    }   
}


module.exports = {
  createSettings,
  getSettings,
  getMainSettings,
  getGeneralSettings,
  getHomeSettings,
  getBrandingSettings,
  updateMainSettings,
  updateGeneralSettings,
  updateHomeSettings,
  updateBrandingSettings,
  getZoneSettings,
  createZoneSettings,
  createReturnPolicy,
  createShipping,
  createcancellationpolicies
};
