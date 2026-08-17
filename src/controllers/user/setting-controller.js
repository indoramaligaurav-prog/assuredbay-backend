const Settings = require("../../models/Settings");
const Currency = require("../../models/Currencies");

// Get Full Settings
const getMainSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne().select(["main", "general"]);

    if (!settings) {
      settings = await Settings.findOne().select(["main"]);
    }
    const currency = await Currency.findOne({
      base: true,
    });

    res.status(200).json({
      success: true,
      data: {
        ...settings.main,
        baseCurrency: currency.code || "USD",
        cloudName: settings.general.cloudinary.cloudName,
        preset: settings.general.cloudinary.preset,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
};
const getBrandingSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne().select(["branding"]);

    if (!settings) {
      settings = await Settings.findOne().select(["branding"]);

      if (!settings) {
        return res.status(404).json({
          success: false,
          message: "Settings not found even after initialization",
        });
      }
    }

    const { branding } = settings;

    res.status(200).json({
      success: true,
      data: branding,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
};
const getHomeSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne().select(["home"]);

    if (!settings) {
      settings = await Settings.findOne().select(["home"]);

      if (!settings) {
        return res.status(404).json({
          success: false,
          message: "Settings not found even after initialization",
        });
      }
    }

    const { home } = settings;

    res.status(200).json({
      success: true,
      data: home,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
};
const getGeneralSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne().select(["general"]);

    if (!settings) {
      settings = await Settings.findOne().select(["general"]);

      if (!settings) {
        return res.status(404).json({
          success: false,
          message: "Settings not found even after initialization",
        });
      }
    }

    const { general, _id } = settings;

    res.status(200).json({
      success: true,
      data: { ...general, _id },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
};

module.exports = {
  getMainSettings,
  getBrandingSettings,
  getHomeSettings,
  getGeneralSettings,
};
