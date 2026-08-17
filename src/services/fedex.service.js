const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const BASE_URL = process.env.FEDEX_BASE_URL;

async function getFedExToken() {
  const res = await axios.post(
    `${BASE_URL}/oauth/token`,
    new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     process.env.FEDEX_CLIENT_ID,
      client_secret: process.env.FEDEX_CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data.access_token;
}

async function createShipment({ sender, recipient, parcel, commodity, orderItemId, orderNo }) {
  const token = await getFedExToken();

  const payload = {
    labelResponseOptions: "LABEL",

    accountNumber: {
      value: process.env.FEDEX_ACCOUNT_NUMBER
    },

    requestedShipment: {
      shipDateStamp: new Date().toISOString().split("T")[0],

      pickupType: "DROPOFF_AT_FEDEX_LOCATION",

      serviceType: "FEDEX_INTERNATIONAL_CONNECT_PLUS",

      packagingType: "YOUR_PACKAGING",

      shipper: {
        contact: {
          personName:  sender.name,
          phoneNumber: sender.phone,
        },
        address: {
          streetLines:          [sender.address],
          city:                 sender.city,
          stateOrProvinceCode:  sender.state,
          postalCode:           sender.zipcode,
          countryCode:          sender.countryCode,
        }
      },

      recipients: [
        {
          contact: {
            personName:  recipient.name,
            phoneNumber: recipient.phone,
          },
          address: {
            streetLines:          [recipient.address],
            city:                 recipient.city,
            stateOrProvinceCode:  recipient.state,
            postalCode:           recipient.zip,
            countryCode:          recipient.countryCode,
          }
        }
      ],

      shippingChargesPayment: {
        paymentType: "SENDER",
        payor: {
          responsibleParty: {
            accountNumber: {
              value: process.env.FEDEX_ACCOUNT_NUMBER
            }
          }
        }
      },

      shipmentSpecialServices: {
        specialServiceTypes: []
      },

      customsClearanceDetail: {
        dutiesPayment: {
          paymentType: "SENDER"
        },

        commodities: [
          {
            name:        commodity.name,
            description: commodity.description,

            quantity:        commodity.quantity,
            quantityUnits:   "PCS",
            numberOfPieces:  commodity.quantity,

            countryOfManufacture: commodity.countryOfManufacture,

            harmonizedCode: commodity.harmonizedCode,

            weight: {
              units: "KG",
              value: commodity.weightKg
            },

            // Fixed-currency customs value (USD), per business decision —
            // NOTE: commodity.customsValueUsd is currently the raw order unitPrice (INR),
            // NOT actually converted to USD yet. See flagged limitation.
            customsValue: {
              amount:   commodity.customsValueUsd,
              currency: "USD"
            },

            unitPrice: {
              amount:   commodity.customsValueUsd,
              currency: "USD"
            }
          }
        ]
      },

      requestedPackageLineItems: [
        {
          sequenceNumber: 1,

          weight: {
            units: "KG",
            value: parcel.weight
          },

          dimensions: {
            length: parcel.length,
            width:  parcel.width,
            height: parcel.height,
            units:  "CM"
          }
        }
      ],

      labelSpecification: {
        labelFormatType: "COMMON2D",
        imageType: "PDF",
        labelStockType: "PAPER_4X6"
      }
    }
  };

  console.log(JSON.stringify(payload, null, 2));

  const res = await axios.post(
    `${BASE_URL}/ship/v1/shipments`,
    payload,
    {
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-locale':     'en_US',              // ← required by FedEx
      },
    }
  );

  const shipmentDetail = res.data.output.transactionShipments[0];
  const trackingNumber = shipmentDetail.masterTrackingNumber;
  const shipmentId     = shipmentDetail.shipmentId || trackingNumber;

  // Sandbox returns base64 encoded label in encodedLabel field
  const encodedLabel   = shipmentDetail.pieceResponses[0]
                           .packageDocuments[0].encodedLabel;

  const labelsDir = path.join(__dirname, '../uploads/labels');
  if (!fs.existsSync(labelsDir)) fs.mkdirSync(labelsDir, { recursive: true });

  const fileName  = `label-${orderItemId}-${Date.now()}.pdf`;
  const filePath  = path.join(labelsDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(encodedLabel, 'base64'));

  return {
    trackingNumber,
    shipmentId,
    labelUrl: `/uploads/labels/${fileName}`,
  };
}

async function schedulePickup({ sender, pickupDate, readyTime, closeTime, packageCount, totalWeightKg }) {
  const token = await getFedExToken();

  const payload = {
    associatedAccountNumber: {
      value: process.env.FEDEX_ACCOUNT_NUMBER,
    },
    originDetail: {
      pickupAddressType: 'ACCOUNT',
      pickupLocation: {
        contact: {
          companyName: sender.companyName || 'Vendor',
          personName:  sender.name || 'Vendor',
          phoneNumber: sender.phone || '9999999999',
        },
        address: {
          streetLines: [sender.address || 'Vendor Address'],
          city:               sender.city,
          stateOrProvinceCode: sender.state,
          postalCode:          sender.zipcode,
          countryCode:         sender.countryCode || 'IN',
          residential:         false,
        },
      },
      readyDateTimestamp: `${pickupDate}T${readyTime}Z`,
      customerCloseTime:  closeTime,
      pickupDateType:     'FUTURE_DAY',
    },
    associatedAccountNumberType: 'FEDEX_GROUND',
    totalWeight: {
      units: 'KG',
      value: totalWeightKg || 1,
    },
    packageCount: packageCount || 1,
    carrierCode: 'FDXE',
    pickupChargesPayment: {
      paymentType: 'ACCOUNT',
      payorType:   'SENDER',
    },
  };

  const res = await axios.post(
    `${BASE_URL}/pickup/v1/pickups`,
    payload,
    {
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-locale':     'en_US',
      },
    }
  );

  const output = res.data.output;
  return {
    pickupConfirmationNumber: output?.pickupConfirmationCode || output?.confirmationNumber || null,
    raw: output,
  };
}

module.exports = { createShipment, getFedExToken ,schedulePickup};