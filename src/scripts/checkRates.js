require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") })
const { getRates } = require("../services/fedex");

async function run() {
  try {
    const result = await getRates({
      originZip: "00000",
      originCountry: "AE",
      originAddress: "Warehouse 12, Al Quoz Industrial Area 3",
      originCity: "Dubai",

      destZip: "110048",
      destCountry: "IN",
      destAddress: "Flat No. 204, Block C",
      destCity: "New Delhi",
      destState: "DELHI",

      weight: 0.5,
      weightUnit: "KG",

      length: 20,
      width: 20,
      height: 10,
      dimensionUnit: "CM",

      title: "samsung galaxy watch ultra",
      price: 23995,
      hscode: "839434349",
      quantity: 1,
      currency: "USD",
    });

    const services = result?.output?.rateReplyDetails?.map(r => r.serviceType);
    console.log("Available service types:", services);
  } catch (err) {
    console.error("Rate check failed:", err.response?.data || err.message);
  }
}

run();