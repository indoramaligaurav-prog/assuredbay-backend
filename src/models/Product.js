const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    slug:  { type: String },

    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ── Category ──
    category:      { type: mongoose.Schema.Types.ObjectId, ref: "Category",      required: true },
    subCategory:   { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory",   required: true },
    childCategory: { type: mongoose.Schema.Types.ObjectId, ref: "ChildCategory", required: true },

    // ── Brand ──
    isBranded: { type: Boolean, default: false },
    brand:     { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },

    // ── Item Specifics ──
    condition: {
  type: String,
  enum: ["NEW", "REFURBISHED", "RECONDITIONED","OVERHAULED","AS_IS" , "USED"], 
},
    itemsInSet:  { type: Number, default: 1 },
    stock:       { type: Number, required: true },
    pricingMode: { type: String, enum: ["declare", "quote"], default: "declare" },
    mrp:          { type: Number },
    discountPrice:{ type: Number },
    // ── Additional Details (only rendered fields) ──
    additionalDetails: {
      // Package dimensions
      packageLength:  { type: Number },
      packageWidth:   { type: Number },
      packageHeight:  { type: Number },
      packageWeight:  { type: Number },
      dimensionUnit:  { type: String, default: "cm" },
      weightUnit:     { type: String, default: "kg" },
      hscode: { type: String, default: "" },
      countryOfManufacture: { type: String, default: "" },
      // Custom item specifics
      customSpecifics: [
        {
          name:  { type: String },
          value: { type: String },
        },
      ],
    },

    // ── Description ──
    description: { type: String },

    // ── Variations ──
    hasVariations: { type: Boolean, default: false },

    variationAttributes: [
      {
        name:   { type: String },
        values: [{ type: String }],
      },
    ],

    variations: [
      {
        attributes:    { type: Object },
        price:         { type: Number },
        discountPrice: { type: Number },
        sku:           { type: String },
        stock:         { type: Number },
        images: [
          {
            name: { type: String },
            url:  { type: String },
          },
        ],
      },
    ],

    // ── Product images ──
    images: [
      {
        name: { type: String },
        url:  { type: String },
      },
    ],

    // ── Relations ──
 // ── Relations ──
shop:            { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
shipping_policy: { type: mongoose.Schema.Types.ObjectId, ref: "ShippingPolicy" },
freeShipping: {
  type: Boolean,
  default: false,
},

// ── Shipping & Returns Settings ──
handlingTime: { type: String, default: 'same_day' },
itemLocation: {
   pickupLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PickupLocation',
  },
  streetAddress: { type: String },
  country: { type: String },
    state:   { type: String },
  city:    { type: String },
  zipcode: { type: String },
},
internationalReturns: {
  accepted:       { type: Boolean, default: true },
  allowedWithin:  { type: String,  default: '14' },
  shippingPaidBy: { type: String,  default: 'buyer' },
  refundMethod:   { type: String,  default: 'money_back' },
},

    // ── Status ──
    status: {
      type:    String,
      enum:    ["draft", "published", "pending","reject"],
      default: "draft",
    },
    views: [{ ip: String, date: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

// Virtual alias kept for any existing references
ProductSchema.virtual("variants").get(function () {
  return this.variations;
});

ProductSchema.set("toJSON",   { virtuals: true });
ProductSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", ProductSchema);