require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop");
const generateUsername = require("../utils/usernamegenerator");

const VENDOR_ID = "6aae0539878a23982583bd1e"; // gaurav indora

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const shop = await Shop.findOne({ vendor: VENDOR_ID });
  if (!shop) {
    console.log("Shop not found for vendor", VENDOR_ID);
    return process.exit(1);
  }

  const username = await generateUsername({
    shopName: shop.name,
    type: "shop",
  });

  await User.findByIdAndUpdate(VENDOR_ID, { username });

  await Shop.findOneAndUpdate(
    { vendor: VENDOR_ID },
    {
      kycStatus: "approved",
      kycProcessedAt: new Date(),
    }
  );

  console.log("✅ Done. Username set to:", username, "| kycStatus: approved");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});