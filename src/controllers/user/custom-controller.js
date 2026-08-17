const UserZone = require('../../models/UserZone');
const Country = require('../../models/Countries');
const Zone = require('../../models/Zone')
const Shop = require('../../models/Shop')
const User = require('../../models/User')
const SubCategory = require('../../models/SubCategory')
const ChildCategory = require('../../models/ChildCategory')
const QuoteMessage = require('../../models/QuoteMessage');
const Notifications = require("../../models/Notification");
const { deleteOldFile } = require("../../utils/deleteOldFile"); 

const { createVerificationSession } = require("../../services/stripeKycService");
const { createConnectedAccount, createOnboardingLink } = require('../../services/stripeConnect');

const mongoose = require('mongoose');

const shippingpolicy = require('../../models/shippingpolicy');
const returnpolicy   = require('../../models/returnpolicy');
const CancelPolicy   = require('../../models/cancelpolicies');
const Product = require('../../models/Product');
const Settings   = require('../../models/Settings');
const slugify = require("slugify");

const Currency = require('../../models/Currencies');
const countries = require('../../models/Countries');
const QuoteRequest = require('../../models/QuoteRequest');


exports.checkzoneassign = async (req, res) => {
  try {
    const userId = req.params.id;

  
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find zone data for this user
    const zone = await UserZone.findOne({ user_id: userId });

    if (!zone) {
      return res.status(200).json({
        success: false,
        assigned: false,
        message: "Zone not assigned",
      });
    }

     const zoneConfig = await Zone.findOne({
      country_code: zone.country
    });

  

    return res.status(200).json({
      success: true,
      assigned: true,
      message: "Zone assigned",
      data: zone,
      kyc_docs: zoneConfig?.kyc_docs || [], // ✅ important   
    });

  } catch (error) {
    console.error("Error checking zone:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.postuserzone = async (req, res) => {

  try {
    const {
      user_id,
      country,
      country_code,
      state,
      city,
      pincode,
      address
    } = req.body;



    const Countrymodal = await Country.findOne({ code: country});

    const countname = Countrymodal.label;


    // Required field validation
    if (!user_id || !country ||  !state || !city || !pincode) {
      return res.status(400).json({
        status: false,
        message: "All required fields must be filled.",
      });
    }

    // Check if zone already exists for this user
    let existingZone = await UserZone.findOne({ user_id });

    let result;

    if (existingZone) {
      // Update existing
      existingZone.country = countname;
      existingZone.country_code = country_code;
      existingZone.state = state;
      existingZone.city = city;
      existingZone.pincode = pincode;
      existingZone.address = address;

      result = await existingZone.save();
    } else {
      // Create new zone
      result = await UserZone.create({
        user_id,
        country,
        country_code: country_code,
        state,
        city,
        pincode,
        address,
      });
    }

    res.status(200).json({
      status: true,
      message: "User zone saved successfully!",
      data: result,
    });

  } catch (error) {
    console.error("User Zone Error:", error);

    // Handle unique constraint error (duplicate user_id)
    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "User zone already exists for this user.",
      });
    }

    res.status(500).json({
      status: false,
      message: "Server error while saving user zone.",
    });
  }
};




exports.postshops = async (req, res) => {
  try {
    const { shopName, vendor, shopPhone } = req.body;

    if (!shopName || !vendor || !shopPhone) {
      return res.status(400).json({
        success: false,
        message: "Shop name, vendor, and phone number are required",
      });
    }

    let logo = null;
    let identityVerification = [];

    if (req.files?.length) {
      req.files.forEach((file) => {
        const url = process.env.STORAGE_DRIVER === 's3'
          ? file.location
          : `/uploads/shops/${file.filename}`;

        if (file.fieldname === "logo") {
          logo = { _id: file.filename, url };
        } else {
          identityVerification.push({ title: file.fieldname, url });
        }
      });
    }

    const users = await User.findById(vendor);
    if (!users) {
      return res.status(404).json({
        success: false,
        message: "Vendor user not found",
      });
    }

    const userZone = await UserZone.findOne({ user_id: vendor });
    const countryCode = userZone?.country || 'AE';

    // 🔑 Look for an existing shop for this vendor that hasn't been approved yet
    let shop = await Shop.findOne({
      vendor,
      status: { $in: ["pending", "rejected"] }, // adjust statuses as needed
    });

    if (shop) {
  if (logo) {
    if (shop.logo?.url) {
      await deleteOldFile(shop.logo.url);
    }
    shop.logo = logo;
  }

  if (identityVerification.length) {
    const newTitles = identityVerification.map((doc) => doc.title);

    const oldDocsForReplacedTitles = (shop.identityVerification || []).filter((doc) =>
      newTitles.includes(doc.title)
    );
    await Promise.all(oldDocsForReplacedTitles.map((doc) => deleteOldFile(doc.url)));

    const untouchedDocs = (shop.identityVerification || []).filter(
      (doc) => !newTitles.includes(doc.title)
    );
    shop.identityVerification = [...untouchedDocs, ...identityVerification];
  }

  shop.name = shopName;
  shop.slug = slugify(shopName, { lower: true });
  shop.metaTitle = shopName;
  shop.metaDescription = shopName;
  shop.description = shopName;
  shop.shopPhone = shopPhone;
  shop.status = "pending";

  await shop.save();
    } else {
      shop = await Shop.create({
        vendor,
        status: "pending",
        name: shopName,
        slug: slugify(shopName, { lower: true }),
        metaTitle: shopName,
        metaDescription: shopName,
        description: shopName,
        shopEmail: "NA",
        shopPhone: shopPhone,
        address: { country: "NA", city: "NA", state: "NA", streetAddress: "NA" },
        logo,
        identityVerification,
      });
    }

    // Only create a Stripe connected account if this shop doesn't already have one
    let account;
    if (!shop.stripeAccountId) {
      account = await createConnectedAccount(users, shop, countryCode);
      shop.stripeAccountId = account.id;
      await shop.save();
    }

    users.role = 'vendor';
    users.shop = shop._id;
    users.commission = 0;
    await users.save();

    // Avoid spamming duplicate notifications on retry
    const existingNotification = await Notifications.findOne({
      shopId: shop._id,
      type: 'vendor_registration',
    });

    if (!existingNotification) {
      await Notifications.create({
        opened: false,
        title: `New vendor signup request received for "${shop.name}".`,
        shopId: shop._id,
        vendorId: users._id,
        type: 'vendor_registration',
      });
    }

    const accountLink = await createOnboardingLink(shop.stripeAccountId);

    return res.status(201).json({
      success: true,
      message: "Shop created successfully",
      data: shop,
      verificationUrl: accountLink.url,
    });
  } catch (error) {
    console.error("postshops error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create shop",
    });
  }
};

/**
 * GET ALL SUB CATEGORIES
 * /api/all-subcategories
 */
exports.all_subcategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find({
      status: 'active'
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: subCategories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET ALL CHILD CATEGORIES
 * /api/all-childcategories
 */
exports.all_childcategories = async (req, res) => {
  try {
    const childCategories = await ChildCategory.find({
      status: 'active'
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: childCategories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getallpoliciesforlisting = async (req, res) => {
  try {

      const shipping = await shippingpolicy.find({ status: true }).lean();
      const returns  = await returnpolicy.find({ status: true }).lean();
      const cancels  = await CancelPolicy.find({ status: true }).lean();

   

    res.json({
      success: true,
      data: {
        shipping_policies: shipping,
        return_policies: returns,
        cancel_policies: cancels
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load policies' });
  }
};


exports.createProduct = async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
 
    // ── Product-level images ──
    const productImages = (req.files || [])
      .filter((f) => f.fieldname === "images")
      .map((file) => ({
        name: file.filename,
        url:
          process.env.STORAGE_DRIVER === "s3"
            ? file.location
            : `/uploads/products/${file.filename}`,
      }));
 
    // ── Variation images, keyed by index ──
    const variationImageMap = {};
    (req.files || []).forEach((file) => {
      if (file.fieldname.startsWith("variation_images_")) {
        const index = file.fieldname.split("_")[2]; // "0", "1", "2" …
        if (!variationImageMap[index]) variationImageMap[index] = [];
        variationImageMap[index].push({
          name: file.filename,
          url:
            process.env.STORAGE_DRIVER === "s3"
              ? file.location
              : `/uploads/products/${file.filename}`,
        });
      }
    });
 
    // ── Merge variation images into variation rows ──
    const finalVariations = (data.variations || []).map((v, i) => ({
      attributes:    v.attributes,
      price:         v.price         ? Number(v.price)         : undefined,
      discountPrice: v.discountPrice ? Number(v.discountPrice) : undefined,
      sku:           v.sku,
      stock:         v.stock         ? Number(v.stock)         : undefined,
      images:        variationImageMap[i] || [],
    }));
 
    // ── additionalDetails — only the fields the form sends ──
    const ad = data.additionalDetails || {};
    const additionalDetails = {
      packageLength:   ad.packageLength  ? Number(ad.packageLength)  : undefined,
      packageWidth:    ad.packageWidth   ? Number(ad.packageWidth)   : undefined,
      packageHeight:   ad.packageHeight  ? Number(ad.packageHeight)  : undefined,
      packageWeight:   ad.packageWeight  ? Number(ad.packageWeight)  : undefined,
      dimensionUnit:   ad.dimensionUnit  || "cm",
      weightUnit:      ad.weightUnit     || "kg",
        hscode:          ad.hscode || "",
      countryOfManufacture: ad.countryOfManufacture || "",
      customSpecifics: Array.isArray(ad.customSpecifics) ? ad.customSpecifics : [],
    };
 
    // ── Slug ──
    const slug = slugify(data.title, { lower: true, strict: true });
 
    // ── Create product ──
    const product = await Product.create({
      // Category
      category:      data.category,
      subCategory:   data.subCategory,
      childCategory: data.childCategory,
 
      // Identity
      title:  data.title,
      slug,
      vendor: req.vendor._id,
 
      // Brand
      isBranded: data.isBranded || false,
      brand:     data.isBranded ? data.brand : null,
 
      // Item specifics
      condition:     data.condition,
      itemsInSet:    data.itemsInSet,
      stock:         data.stock,
      pricingMode:   data.pricingMode,
      mrp:           data.mrp           ? Number(data.mrp)           : undefined,
      discountPrice: data.discountPrice ? Number(data.discountPrice) : undefined,
 
      // Additional details
      additionalDetails,
 
      // Description
      description: data.description,
 
      // Variations
      hasVariations:       data.hasVariations || false,
      variationAttributes: data.variationAttributes || [],
      variations:          finalVariations,
 
      // Images
      images: productImages,
 
      // Policies
     // Policies
shipping_policy:      data.shipping_policy,
freeShipping: data.freeShipping ?? false,
handlingTime:         data.handlingTime || 'same_day',
itemLocation:         data.itemLocation || {},
internationalReturns: data.internationalReturns || {},
status:               data.status || 'draft',
    });
 
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    console.error("createProduct error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.convertPrice = async (req, res) => {
 const { amount, vendorId, userId, currency } = req.body;



  if (typeof amount !== 'number' || !vendorId) {
    return res.json(null);
  }

  // ─── Vendor currency ─────────────────────────
  const vendorZone = await UserZone.findOne({ user_id: vendorId });

  if (!vendorZone) {

        return res.json(null);

  }
   
  const vendorCurrency = await countries.findOne({
     code: vendorZone.country?.trim().toUpperCase()
  });

  


  const fromCurrency = vendorCurrency.currency;


  const toCurrency = currency || 'USD';  

  // ─── Rates ───────────────────────────────────
  const currencies = await Currency.find({ status: 'active' });
  const rates = {};
  currencies.forEach(c => (rates[c.code] = c.rate));


  const currencysymbolfind = await countries.findOne({
     currency: toCurrency?.trim().toUpperCase()
  });

    const currencysymbol = currencysymbolfind.currency_symbol;


  // ─── Conversion ──────────────────────────────
  if (fromCurrency === toCurrency) {
    return res.json({ amount, currency: toCurrency });
  }



  const inUSD =
    fromCurrency === 'USD'
      ? amount
      : amount / rates[fromCurrency];

  const converted =
    toCurrency === 'USD'
      ? inUSD
      : inUSD * rates[toCurrency];

      // console.log(converted);


  return res.json({
    amount: Number(converted.toFixed(2)),
    currency: toCurrency
  });
};

exports.getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category subCategory childCategory brand')
    .populate('shipping_policy return_policy cancel_policy');

  res.json({ success: true, data: product });
};

exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const data = JSON.parse(req.body.data);

    const oldProduct = await Product.findById(productId);
    if (!oldProduct) return res.status(404).json({ success: false, message: "Product not found" });

    // ── Status based update restriction ──
    const isPublished = oldProduct.status === 'published';

    if (isPublished) {
      const restricted = await Product.findByIdAndUpdate(
        productId,
        {
          mrp:           data.mrp           ? Number(data.mrp)           : oldProduct.mrp,
          discountPrice: data.discountPrice ? Number(data.discountPrice) : oldProduct.discountPrice,
          stock:         data.stock         ? Number(data.stock)         : oldProduct.stock,
          variations: oldProduct.variations.map((v, i) => ({
            ...v.toObject(),
            price:         data.variations?.[i]?.price         ? Number(data.variations[i].price)         : v.price,
            discountPrice: data.variations?.[i]?.discountPrice ? Number(data.variations[i].discountPrice) : v.discountPrice,
            stock:         data.variations?.[i]?.stock         ? Number(data.variations[i].stock)         : v.stock,
          })),
        },
        { new: true }
      );
      return res.json({ success: true, data: restricted });
    }

    // ── Main images (draft only) ──
    const uploadedMainImages = (req.files || [])
      .filter((f) => f.fieldname === "images")
      .map((file) => ({
        name: file.filename,
        url: process.env.STORAGE_DRIVER === "s3"
          ? file.location
          : `/uploads/products/${file.filename}`,
      }));

    const productImages = [
      ...(data.existingImages || oldProduct.images || []),
      ...uploadedMainImages,
    ];

    // ── Variation images (draft only) ──
    const variationImageMap = {};
    (req.files || []).forEach((file) => {
      if (file.fieldname.startsWith("variation_images_")) {
        const index = file.fieldname.split("_")[2];
        if (!variationImageMap[index]) variationImageMap[index] = [];
        variationImageMap[index].push({
          name: file.filename,
          url: process.env.STORAGE_DRIVER === "s3"
            ? file.location
            : `/uploads/products/${file.filename}`,
        });
      }
    });

    // ── Merge variation images (draft only) ──
  const finalVariations = (data.variations || []).map((v, i) => ({
  _id: v._id || oldProduct.variations?.[i]?._id,

  attributes: v.attributes,
  price: v.price ? Number(v.price) : undefined,
  discountPrice: v.discountPrice ? Number(v.discountPrice) : undefined,
  sku: v.sku,
  stock: v.stock ? Number(v.stock) : undefined,

  images: [
    ...(v.existingImages || oldProduct.variations?.[i]?.images || []),
    ...(variationImageMap[i] || []),
  ],
}));

    // ── additionalDetails (draft only) ──
    const ad = data.additionalDetails || {};
    const additionalDetails = {
      packageLength:   ad.packageLength  ? Number(ad.packageLength)  : undefined,
      packageWidth:    ad.packageWidth   ? Number(ad.packageWidth)   : undefined,
      packageHeight:   ad.packageHeight  ? Number(ad.packageHeight)  : undefined,
      packageWeight:   ad.packageWeight  ? Number(ad.packageWeight)  : undefined,
      dimensionUnit:   ad.dimensionUnit  || "cm",
      weightUnit:      ad.weightUnit     || "kg",
        hscode:          ad.hscode || "",
         countryOfManufacture: ad.countryOfManufacture || "",
      customSpecifics: Array.isArray(ad.customSpecifics) ? ad.customSpecifics : [],
    };

    // ── Slug (draft only) ──
    const slug = slugify(data.title, { lower: true, strict: true });

    // ── Full update (draft only) ──
    const updated = await Product.findByIdAndUpdate(
      productId,
      {
        // Category
        category:      data.category,
        subCategory:   data.subCategory,
        childCategory: data.childCategory,

        // Identity
        title: data.title,
        slug,

        // Brand
        isBranded: data.isBranded || false,
        brand:     data.isBranded ? data.brand : null,

        // Item specifics
          condition:     data.condition,
        itemsInSet:    data.itemsInSet,
        stock:         data.stock,
        pricingMode:   data.pricingMode,
        mrp:           data.mrp           ? Number(data.mrp)           : undefined,
        discountPrice: data.discountPrice ? Number(data.discountPrice) : undefined,

        // Additional details
        additionalDetails,

        // Description
        description: data.description,

        // Variations
        hasVariations:       data.hasVariations || false,
        variationAttributes: data.variationAttributes || [],
        variations:          finalVariations,

        // Images
        images: productImages,

        // Policies
        shipping_policy:      data.shipping_policy,
        freeShipping: data.freeShipping ?? false,
        handlingTime:         data.handlingTime || 'same_day',
        itemLocation:         data.itemLocation || {},
        internationalReturns: data.internationalReturns || {},

        // Status
        status: data.status || oldProduct.status,
      },
      { new: true }
    );

    res.json({ success: true, data: updated });

  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;



    if (!['published', 'draft'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.uploadHomeSlider = async (req, res) => {
  try {
    const file = req.files?.[0];
    if (!file) return res.status(400).json({ message: 'File missing' });

    let imageUrl = '';
    let publicId = '';

    if (process.env.STORAGE_DRIVER === 's3') {
      imageUrl = file.location;
      publicId = file.key;
    } else {
      imageUrl = `/uploads/slides/${file.filename}`;
      publicId = file.filename;
    }

    // 🔍 Find settings document
    const settings = await Settings.findOne();
    if (!settings) return res.status(404).json({ message: 'Settings not found' });

    // 🆕 Push new slide
    settings.home.slides.push({
      image: { _id: publicId, url: imageUrl },
      link: req.body.link || ''
    });

    await settings.save();

    res.json({
      success: true,
      slide: {
        image: { _id: publicId, url: imageUrl },
        link: req.body.link || ''
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Slider upload failed' });
  }
};

exports.getVendorIdByProduct = async (req, res) => {

  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId).lean();
    if (!product) {

      return res.status(404).json({ message: 'Product not found' });

    }

    return res.json({ vendorId: product.vendor });


  }
  catch (err) {

    console.error(err);
  }

}

exports.getshippingpolicy = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Shipping policy id is required'
      });
    }


    const policy = await shippingpolicy.findById(id).lean();

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Shipping policy not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: policy
    });

  } catch (error) {
    console.error('Get Shipping Policy Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
};

exports.createQuoteRequest = async (req, res) => {
  try {
    
  
    const {
      productId,
      vendorId,
      templateKey,
      quantity,
      location,
      notifyWhatsapp,
      userId,
      freightType
    } = req.body;

    if (
      !productId ||
      !vendorId ||
      !templateKey ||
      !quantity ||
      !location?.pincode||
      !userId
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const productExist = await QuoteRequest.findOne({ 
        product: productId, 
        vendor: vendorId, 
        buyer: userId 
    });
    if(productExist){
        return res.status(404).json({
        success: false,
        message: 'Product already qouted'
      });
    }
    // Optional: validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const quote = await QuoteRequest.create({
      product: productId,
      vendor: vendorId,
      buyer: userId,
      templateKey,
      quantity,
       deliveryLocation: location,
      freightType,      
      notifyWhatsapp
    });

    return res.status(201).json({
      success: true,
      message: 'Quote request sent successfully',
      data: quote
    });
  } catch (err) {
    console.error('Create Quote Request Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
};

exports.getqoutbyvendor = async (req, res) => {
  try {
    const vendorid = req.params.id; // or req.vendorid if using middleware

    const quotes = await QuoteRequest.find({ vendor: vendorid })
      .populate({
        path: 'product',
        select: 'title images shipping_policy pricingMode' // ✅ product title + image
      })
      .populate({
        path: 'buyer',
        select: '_id' // ❌ do NOT expose email/phone
      })
      .sort({ createdAt: -1 });

    // 🔒 Mask buyer identity
    const formattedQuotes = quotes.map((q) => {
      const obj = q.toObject();

      return {
        ...obj,
        product: {
          _id: obj.product._id,
          title: obj.product.title,
          image: obj.product.images?.[0]?.url || null,
          shipping_policy: obj.product.shipping_policy || null,
          pricingMode : obj.product.pricingMode || null
        },
        buyerKey: `BUY-${obj.buyer._id.toString().slice(-6).toUpperCase()}`,
        buyer: undefined
      };
    });

      

    return res.status(200).json({
      success: true,
      data: formattedQuotes
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quote requests'
    });
  }
};

exports.getqoutbyuser = async (req, res) => {
  try {
    const userid = req.params.id; // or req.vendorid if using middleware

    const quotes = await QuoteRequest.find({ buyer: userid })
      .populate({
        path: 'product',
           select: '_id title images pricingMode vendor shipping_policy'
      })
      .populate({
        path: 'buyer',
        select: '_id' // ❌ do NOT expose email/phone
      })
      .sort({ createdAt: -1 });

    // 🔒 Mask buyer identity
    const formattedQuotes = quotes.map((q) => {
      const obj = q.toObject();

      return {
        ...obj,
        product: {
          _id: obj.product._id,
          title: obj.product.title,
          image: obj.product.images?.[0]?.url || null,
          pricingMode : obj.product.pricingMode || null,
          shipping_policy: obj.product.shipping_policy || null,
          vendor: obj.product.vendor || null
        },
        buyerKey: `BUY-${obj.buyer._id.toString().slice(-6).toUpperCase()}`,
        buyer: undefined
      };
    });

      

    return res.status(200).json({
      success: true,
      data: formattedQuotes
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quote requests'
    });
  }
};


/* ---------------- MESSAGE MAP ---------------- */
const MESSAGE_MAP = {
  price_request: 'Please share your best price for this quantity.',
  delivery_time: 'What is the expected delivery timeline?',
  bulk_discount: 'Is bulk discount available?',
  availability: 'Is this product currently available in stock?'
};

exports.sendQuotemessage = async (req, res) => {
  try {
    const {
      quoteId,
      senderType,
      messageKey,     // optional (old flow)
      messageType,    // NEW
      messageText,    // NEW
      payload         // NEW (optional)
    } = req.body;

    if (!['buyer', 'vendor'].includes(senderType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sender type'
      });
    }

    const quote = await QuoteRequest.findById(quoteId);
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    let finalMessageText = messageText;
    let finalMessageType = messageType || 'TEXT';

    // 🧠 BACKWARD COMPATIBILITY (OLD FLOW)
    if (messageKey) {
      if (!MESSAGE_MAP[messageKey]) {
        return res.status(400).json({
          success: false,
          message: 'Invalid message key'
        });
      }

      finalMessageText = MESSAGE_MAP[messageKey];
      finalMessageType = 'TEXT';
    }

    if (!finalMessageText) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    const message = await QuoteMessage.create({
      quote: quoteId,
      senderType,
      messageType: finalMessageType,
      messageKey: messageKey || null,
      messageText: finalMessageText,
      payload: payload || null
    });

    // 🔄 Auto status update (same as before)
    if (senderType === 'vendor' && quote.status === 'pending') {
      quote.status = 'responded';
      await quote.save();
    }

    return res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('sendQuoteMessage error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};



exports.getQuoteChat = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const vendorid = req.vendorid;

    const quote = await QuoteRequest.findById(quoteId)
      .populate('product', 'title images');

    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }


    const messages = await QuoteMessage.find({ quote: quoteId }).sort({ createdAt: 1 });

    return res.json({
      success: true,
      product: quote.product,
      buyerKey: `BUY-${quote.buyer.toString().slice(-6).toUpperCase()}`,
      messages
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

exports.getAllCountries = async (req, res) => {

  try {

        const countries = await Country.find().sort({ label: 1 });

        res.status(200).json({ success: true, data: countries });



  }catch (err) {

    console.error(err);

    res.status(500).json({ success: false });

  }
};

exports.getCourierRate = async (req, res) => {
  try {
    const { vendorId, buyerPincode, items } = req.body;

    console.log('Courier test payload:', {
      vendorId,
      buyerPincode,
      items
    });

    // 🔥 STATIC VALUE FOR TESTING
    const STATIC_COURIER_CHARGE = 120;

    return res.json({
      success: true,
      amount: STATIC_COURIER_CHARGE
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate courier rate'
    });
  }
};

exports.getreturnpolicy = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Return policy id is required'
      });
    }
 
    const policy = await returnpolicy.findById(id).lean();
 
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Return policy not found'
      });
    }
 
    return res.status(200).json({
      success: true,
      data: policy
    });
 
  } catch (error) {
    console.error('Get Return Policy Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
};
 
exports.getcancelpolicy = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Cancel policy id is required'
      });
    }
 
    const policy = await CancelPolicy.findById(id).lean();
 
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Cancel policy not found'
      });
    }
 
    return res.status(200).json({
      success: true,
      data: policy
    });
 
  } catch (error) {
    console.error('Get Cancel Policy Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
};

exports.getRelatedProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 8;

    // Find the current product first
    const current = await Product.findOne({ slug }).lean();
    if (!current) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    console.log('current category:', current.category, 'subCategory:', current.subCategory);

    // Cast to ObjectId explicitly — required for aggregate $match
    const categoryId    = new mongoose.Types.ObjectId(current.category);
    const subCategoryId = current.subCategory
      ? new mongoose.Types.ObjectId(current.subCategory)
      : null;
    const currentId     = new mongoose.Types.ObjectId(current._id);

    const projectFields = {
      title:         1,
      slug:          1,
      mrp:           1,
      discountPrice: 1,
      pricingMode:   1,
      images:        1,
      vendor:        1,
      stock:         1,
    };

    // ── PASS 1: same category + subCategory ──────────────────────────────────
    let related = await Product.aggregate([
      {
        $match: {
          _id:         { $ne: currentId },
          status:      'published',
          category:    categoryId,
          ...(subCategoryId && { subCategory: subCategoryId }),
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      { $project: projectFields },
    ]);

    console.log('pass 1 (subCategory match):', related.length);

    // ── PASS 2: same category only ───────────────────────────────────────────
    if (related.length < limit) {
      const seen = new Set(related.map(p => p._id.toString()));

      const fallback = await Product.aggregate([
        {
          $match: {
            _id:      { $ne: currentId },
            status:   'published',
            category: categoryId,
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        { $project: projectFields },
      ]);

      console.log('pass 2 (category only):', fallback.length);

      for (const p of fallback) {
        if (!seen.has(p._id.toString())) {
          related.push(p);
          seen.add(p._id.toString());
        }
        if (related.length >= limit) break;
      }
    }

    // ── PASS 3: any published product (last resort) ──────────────────────────
    if (related.length < 4) {
      const seen = new Set(related.map(p => p._id.toString()));

      const anyProducts = await Product.aggregate([
        {
          $match: {
            _id:    { $ne: currentId },
            status: 'published',
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        { $project: projectFields },
      ]);

      console.log('pass 3 (any published):', anyProducts.length);

      for (const p of anyProducts) {
        if (!seen.has(p._id.toString())) {
          related.push(p);
          seen.add(p._id.toString());
        }
        if (related.length >= limit) break;
      }
    }

    console.log('final related count:', related.length);

    return res.status(200).json({
      success: true,
      data: related,
    });

  } catch (error) {
    console.error('getRelatedProducts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
};










