const { getRates } = require('../../services/fedex');
const Product = require('../../models/Product');
const Country = require('../../models/Countries');
const UserZone = require('../../models/UserZone');           

exports.getShippingRates = async (req, res) => {
  try {

    const {
      productId,
      destCountry,
      destZip,
      destCity,
      destState,
      destAddress,
      quantity        
    } = req.body;

    // console.log('Received getShippingRates request with body:', req.body);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId is required'
      });
    }

    if (!destCountry) {
      return res.status(400).json({
        success: false,
        message: 'Destination country is required'
      });
    }

    const product = await Product.findById(productId).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const ad =
      product.additionalDetails || {};

    /* =====================================
       ORIGIN COUNTRY
    ===================================== */

    const countryDoc =
      await Country.findOne({
        label: product.itemLocation?.country
      }).lean();

    const originCountry =
      countryDoc?.value ||
      countryDoc?.code ||
      'AE';

    const originZip =
  product.itemLocation?.postalCode ||
  product.itemLocation?.zipCode ||
  product.itemLocation?.zipcode ||
  product.itemLocation?.pincode ||
  '00000';

    /* =====================================
       PACKAGE DETAILS
    ===================================== */

    const weight =
      Number(ad.packageWeight) || 1;

    const length =
      Number(ad.packageLength) || 10;

    const width =
      Number(ad.packageWidth) || 10;

    const height =
      Number(ad.packageHeight) || 10;

    let weightUnit =
      (ad.weightUnit || 'KG')
      .toUpperCase();

    let dimensionUnit =
      (ad.dimensionUnit || 'CM')
      .toUpperCase();

    // FedEx allowed values

    if (weightUnit === 'GM') {
      weightUnit = 'KG';
    }

    if (weightUnit === 'OZ') {
      weightUnit = 'LB';
    }

    if (
      dimensionUnit === 'INCH'
    ) {
      dimensionUnit = 'IN';
    }


    /* =====================================
       RATE API
    ===================================== */


    // ── Resolve destination country code (same as origin) ──
const destCountryDoc = await Country.findOne({ label: destCountry }).lean();
const destCountryCode = destCountryDoc?.value || destCountryDoc?.code || destCountry;

// ── Origin full address fields from product ──
const originAddress = product.itemLocation?.streetAddress || '';
const originCity    = product.itemLocation?.city          || '';
const originState   = product.itemLocation?.state         || '';

const vendorZone = await UserZone.findOne({ user_id: product.vendor }).lean();
const vendorCountryCode = vendorZone?.country || originCountry;

const currencyDoc = await Country.findOne({ code: vendorCountryCode }).lean();
const originCurrency = currencyDoc?.currency || 'USD';



   const rateData = await getRates({
  originZip,
  originCountry,
  originAddress,          // ← full street address
  originCity,
  originState,

    destZip:     destZip || '00000',
  destCountry: destCountryCode,   // ← code, not label
  destAddress: destAddress || '',
  destCity:    destCity    || '',
  destState:   destState   || '',

  weight,
  weightUnit,
  length,
  width,
  height,
  dimensionUnit,
  
  title: product.title,
  price: product.discountPrice || product.price || 100,
  hscode: ad.hscode || '',
   quantity: Number(quantity) || 1, 
   currency: originCurrency
});

// console.log('FedEx Params:', {
//   originZip, originCountry, originAddress, originCity, originState,
//   destZip: destZip || '00000', destCountry: destCountryCode,
//   destAddress, destCity, destState,
//   weight, weightUnit, length, width, height, dimensionUnit,
//   title: product.title,
//   price: product.discountPrice || product.price || 100,
//   hscode: ad.hscode || ''
// });


    const rateDetails =
      rateData?.output?.rateReplyDetails || [];

    const shippingRates = rateDetails.map((rate) => {
  const shipment = rate.ratedShipmentDetails?.[0];
  const rawTransit = rate.operationalDetail?.transitTime || null;

  return {
    serviceType: rate.serviceType,
    serviceName: rate.serviceName || rate.serviceType,
    charge: Number(shipment?.totalNetCharge) || 0,
    currency: shipment?.currency || 'USD',
    deliveryDate: rate.operationalDetail?.deliveryDate || rate.operationalDetail?.commitDate || null,
    transitDays: rawTransit
      ? rawTransit.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : null,
   importFeesNote: destCountryCode !== originCountry ? 'may_apply' : null,
  };
});

    return res.json({
  success: true,
  rates: shippingRates,
});

  } catch (err) {

    // console.error(
    //   'FedEx Error:',
    //   err?.response?.data || err.message
    // );

    return res.status(500).json({
      success: false,
      message:
        err?.response?.data?.errors?.[0]
          ?.message ||
        err.message
    });
  }
};