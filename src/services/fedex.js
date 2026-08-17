const axios = require('axios');

const BASE_URL =
  process.env.FEDEX_BASE_URL ||
  'https://apis-sandbox.fedex.com';

let cachedToken = null;
let tokenExpiry = null;

/* =========================================
   ACCESS TOKEN
========================================= */

const getAccessToken = async () => {
  if (
    cachedToken &&
    tokenExpiry &&
    Date.now() < tokenExpiry
  ) {
    return cachedToken;
  }

  const response = await axios.post(
    `${BASE_URL}/oauth/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.FEDEX_CLIENT_ID,
      client_secret: process.env.FEDEX_CLIENT_SECRET
    }),
    {
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded'
      }
    }
  );

  cachedToken = response.data.access_token;

  tokenExpiry =
    Date.now() +
    ((response.data.expires_in - 60) * 1000);

  return cachedToken;
};

/* =========================================
   RATE API
========================================= */

const getRates = async ({
  originZip,
  originCountry,
  originAddress,
  originCity,

  destZip,
  destCountry,
  destAddress,
  destCity,
  destState,

  weight,
  weightUnit,

  length,
  width,
  height,
  dimensionUnit,

  title,
  price,
  hscode,
  quantity,
  currency, 
}) => {

  const token = await getAccessToken();

const payload = {
  accountNumber: {
    value: process.env.FEDEX_ACCOUNT_NUMBER
  },

  rateRequestControlParameters: {
    returnTransitTimes: true
  },

  requestedShipment: {
    pickupType: "DROPOFF_AT_FEDEX_LOCATION",

    rateRequestType: [
      "ACCOUNT",
      "LIST"
    ],

    shipper: {
      address: {
        streetLines: [originAddress],
        city: originCity,
        postalCode: String(originZip),
        countryCode: originCountry,
        residential: true
      }
    },

    recipient: {
      address: {
        streetLines: [destAddress],
        city: destCity,
        // stateOrProvinceCode: "RJ",
        postalCode: String(destZip),
        countryCode: destCountry,
        residential: false
      }
    },

    packagingType: "YOUR_PACKAGING",

    requestedPackageLineItems: [
      {
        groupPackageCount: 1,

        weight: {
          units: weightUnit,
          value: weight
        },

        dimensions: {
          length,
          width,
          height,
          units: dimensionUnit
        },

        declaredValue: {
          amount: Number(price) * (quantity || 1),
          currency: currency          
        }
      }
    ],

    totalPackageCount: 1,

    customsClearanceDetail:
      originCountry !== destCountry
        ? {
            commodities: [
              {
                name: title.substring(0, 35),
                description: title,

                quantity:  quantity || 1,
                quantityUnits: "PCS",

                weight: {
                  units: weightUnit,
                  value: weight
                },

                customsValue: {
                  amount: Number(price) * (quantity || 1), 
                  currency: currency          
                },

                unitPrice: {
                  amount: Number(price),
                  currency: currency          
                },

                numberOfPieces: quantity || 1,

                harmonizedCode: hscode || undefined,

                countryOfManufacture:
                  originCountry
              }
            ]
          }
        : undefined
  }
};

//   console.log("========== FEDEX PAYLOAD ==========");
// console.log(JSON.stringify(payload, null, 2));
// console.log("===================================");

try {

  const response = await axios.post(
    `${BASE_URL}/rate/v1/rates/quotes`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-locale': 'en_US'
      }
    }
  );

  // console.log("========== FEDEX SUCCESS ==========");
  // console.log(JSON.stringify(response.data, null, 2));
  // console.log("===================================");

  return response.data;

} catch (err) {

  // console.log("========== FEDEX ERROR ==========");
  // console.log(JSON.stringify(err.response?.data, null, 2));
  // console.log("=================================");

  throw err;
}
};

module.exports = {
  getRates
};