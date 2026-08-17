// scripts/seedPermissions.js
const mongoose = require("mongoose");
require("dotenv").config();
const Permission = require("../models/Permission");

const PERMISSIONS = [
  { module: "brands", action: "view", label: "View Brands" },
  { module: "categories", action: "view", label: "View Categories" },
  { module: "products", action: "view", label: "View Products" },
  { module: "shops", action: "view", label: "View Shops" },
  { module: "payouts", action: "view", label: "View Payouts" },
  { module: "coupons", action: "view", label: "View Coupons" },
  { module: "currencies", action: "view", label: "View Currencies" },
  { module: "newsletters", action: "view", label: "View Newsletters" },
  { module: "settings", action: "view", label: "View Settings" }, 
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI); // use your actual connection string env var

  for (const p of PERMISSIONS) {

    const key = `${p.module}.${p.action}`;
    await Permission.updateOne(
      { key },
      { $setOnInsert: { key, ...p } },
      { upsert: true }
    );
    console.log(`✔ ${key}`);
  }

  console.log("Done seeding permissions.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});