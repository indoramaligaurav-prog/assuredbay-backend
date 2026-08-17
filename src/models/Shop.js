const mongoose = require("mongoose");

const ShopSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "approved",
        "pending",
        "in review",
        "action required",
        "blocked",
        "rejected",
      ],
      required: true,
    },
    products: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Product",
      },
    ],

    logo: {
      _id: {
        type: String,
        required: [false, "Image id is required."],
      },
      url: {
        type: String,
        required: [true, "Image url is required."],
      },
    },

    identityVerification: [
  {
    title: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    }
  }
],kycStatus: {
  type: String,
  enum: ["pending", "processing", "approved", "rejected", "manual_review"],
  default: "pending"
},

kycProcessedAt: {
  type: Date
},
stripeAccountId: {
  type: String,
},
payoutsEnabled: {
  type: Boolean,
  default: false,
},
chargesEnabled: {
  type: Boolean,
  default: false,
},
    slug: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    metaTitle: {
      type: String,
      required: [true, "Meta title is required."],
      maxlength: [100, "Meta title cannot exceed 100 characters."],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required."],
      maxlength: [500, "Description cannot exceed 500 characters."],
    },
    metaDescription: {
      type: String,
      required: [true, "Meta description is required."],
      maxlength: [200, "Meta description cannot exceed 200 characters."],
    },
    registrationNumber: { type: String,unique: true ,sparse: true },
    address: {
      country: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      streetAddress: { type: String, required: true },
    },
    contactPerson: { type: String },
    shopEmail: { type: String},
    shopPhone: { type: String, required: true },
    website: { type: String },
    rating: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },

    financialDetails: {
      paymentMethod: { type: String, enum: ["paypal", "bank"] },
      paypal: {
        email: {
          type: String,
        },
      },
      bank: {
        accountNumber: {
          type: String,
        },
        bankName: {
          type: String,
        },
        holderName: {
          type: String,
        },
        holderEmail: {
          type: String,
        },
        address: { type: String },
        routingNumber: { type: String },
        swiftCode: { type: String },
      },
    },
    taxIdentificationNumber: { type: String, required: false },
    vatRegistrationNumber: { type: String },
  },
  {
    timestamps: true,
  }
);

const Shop = mongoose.models.Shop || mongoose.model("Shop", ShopSchema);
module.exports = Shop;
