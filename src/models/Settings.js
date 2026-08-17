const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema(
  {
    main: {
      businessName: {
        type: String,
        required: true,
      },
      domainName: {
        type: String,
        required: true,
      },

      websiteStatus: {
        type: Boolean,
        required: true,
      },
      offlineMessage: {
        type: String,
        required: true,
      },
      seo: {
        metaTitle: {
          type: String,
          required: true,
        },
        metaDescription: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        tags: {
          type: Array,
          required: true,
        },
      },

      gaId: {
        type: String,
        required: true,
      },
      gtmId: {
        type: String,
        required: true,
      },
      shippingFee: {
        type: Number,
        required: [true, "Shipping fee is required"],
      },
      commission: {
        type: Number,
        required: [true, "Commission fee is required"],
      },
    },

    branding: {
      theme: {
        palette: {
          primary: {
            type: String,
            required: true,
            default: "#1C6BD2",
          },
          secondary: {
            type: String,
            required: true,
            default: "#2288EB",
          },
          paperLight: {
            type: String,
            required: true,
            default: "#FFFFFF",
          },
          paperDark: {
            type: String,
            required: true,
            default: "#212B36",
          },
          defaultDark: {
            type: String,
            required: true,
            default: "#161C24",
          },
          defaultLight: {
            type: String,
            required: true,
            default: "#F9FAFB",
          },
        },
        themeName: {
          type: String,
          required: true,
          default: "default",
        },
        fontFamily: {
          type: String,
          enum: ["figtree", "montserrat", "roboto", "open-sans"],
          required: true,
        },
      },
      logoDark: {
        _id: { type: String, required: true },
        url: { type: String, required: true },
      },
      logoLight: {
        _id: { type: String, required: true },
        url: { type: String, required: true },
      },
      favicon: {
        _id: { type: String, required: true },
        url: { type: String, required: true },
      },
      contact: {
        address: {
          type: String,
          required: true,
        },
        addressOnMap: {
          type: String,
          required: true,
        },
        lat: {
          type: String,
          required: true,
        },
        long: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
          index: true,
        },
        phone: {
          type: String,
          required: true,
        },
        whatsappNo: {
          type: String,
        },
      },

      socialLinks: {
        facebook: {
          type: String,
          required: true,
        },
        twitter: {
          type: String,
          required: true,
        },
        linkedin: {
          type: String,
          required: true,
        },
        instagram: {
          type: String,
          required: true,
        },
      },
    },

    // ✅ Branding Fields (Root level now)
    home: {
      slides: [
        {
          image: {
            _id: {
              type: String,
              required: [true, "Image id is required."],
            },
            url: {
              type: String,
              required: [true, "Image url is required."],
            },
          },

          link: {
            type: String,
          },
        },
      ],
      banner1: {
        image: {
          _id: {
            type: String,
            required: [true, "Image id is required."],
          },
          url: {
            type: String,
            required: [true, "Image url is required."],
          },
        },

        link: {
          type: String,
        },
      },
      banner2: {
        image: {
          _id: {
            type: String,
            required: [true, "Image id is required."],
          },
          url: {
            type: String,
            required: [true, "Image url is required."],
          },
        },

        link: {
          type: String,
        },
      },
    },
    general: {
      paypal: {
        isActive: { type: Boolean, default: false },
        mode: {
          type: String,
          enum: ["sandbox", "live"],
          default: "sandbox",
          required: function () {
            return this.isActive;
          },
        },
        clientId: {
          type: String,
          required: function () {
            return this.isActive;
          },
        },
      },
      stripe: {
        isActive: { type: Boolean, default: false },
        mode: {
          type: String,
          enum: ["sandbox", "live"],
          default: "sandbox",
          required: function () {
            return this.isActive;
          },
        },
        publishableKey: {
          type: String,
          required: function () {
            return this.isActive;
          },
        },
        secretKey: {
          type: String,
          required: function () {
            return this.isActive;
          },
        },
      },
      cloudinary: {
        cloudName: {
          type: String,
          required: [true, "Cloudinary Cloud Name is required."],
        },
        apiKey: {
          type: String,
          required: [true, "Cloudinary API Key is required."],
        },
        apiSecret: {
          type: String,
          required: [true, "Cloudinary API Secret is required."],
        },
        preset: {
          type: String,
          required: [true, "Cloudinary Upload Preset is required."],
        },
      },
      smtp: {
        isActive: { type: Boolean, default: false },
        host: {
          type: String,
          required: function () {
            return this.isActive;
          },
        },
        port: {
          type: Number,
          required: function () {
            return this.isActive;
          },
        },
        user: {
          type: String,
          required: function () {
            return this.isActive;
          },
        },
        password: {
          type: String,
          required: function () {
            return this.isActive;
          },
        },
        fromEmail: {
          type: String,
          required: function () {
            return this.isActive;
          },
        },
        secure: {
          type: Boolean,
          default: false, // true = use TLS
        },
      },
    },
  },
  { timestamps: true }
);

const Settings =
  mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

module.exports = Settings;
