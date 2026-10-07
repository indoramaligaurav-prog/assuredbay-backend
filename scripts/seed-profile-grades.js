require("dotenv").config();
const mongoose = require("mongoose");
const ProfileGrade = require("../src/models/ProfileGrade");

const grades = [
  { key: "review", name: "Review", priority: 100, searchHidden: true, searchBoost: 0,
    eligibility: { minWeightedIncidents: 3.0, windowDays: 90 }, badges: [], perks: ["Review dashboard"] },
  { key: "pro", name: "Pro", priority: 40, searchBoost: 1.5,
    eligibility: { minCompletedOrders: 10, maxWeightedIncidents: 0, maxLateShipRate: 0.05, minReplyRate: 0.9, requiresSubscription: true },
    badges: [{ label: "Pro", icon: "⭐", color: "warning" }, { label: "Verified", icon: "✓", color: "success" }],
    perks: ["Pro dashboard", "Promoted listings", "Dedicated support", "Lower commission"] },
  { key: "verified", name: "Verified", priority: 30, searchBoost: 1.2,
    eligibility: { minCompletedOrders: 10, maxWeightedIncidents: 0, maxLateShipRate: 0.05, minReplyRate: 0.9 },
    badges: [{ label: "Verified", icon: "✓", color: "success" }],
    perks: ["Verified dashboard", "Priority search", "Analytics access"] },
  { key: "rising", name: "Rising Seller", priority: 20, searchBoost: 1.0,
    eligibility: { minCompletedOrders: 5, maxCompletedOrders: 9 },
    badges: [{ label: "Rising Seller", icon: "📈", color: "secondary" }],
    perks: ["Rising dashboard", "Metrics unlocked", "Path to Verified shown"] },
  { key: "new", name: "New Seller", priority: 10, isDefault: true, searchBoost: 0.8,
    eligibility: { minCompletedOrders: 0, maxCompletedOrders: 4 },
    badges: [{ label: "New Seller", icon: "🆕", color: "info" }],
    perks: ["New Seller dashboard", "Early Bird eligible"] }
];

(async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error("No Mongo connection string found in .env (tried MONGO_URI, MONGODB_URI, DATABASE_URL)");
  await mongoose.connect(uri);
  for (const g of grades) await ProfileGrade.updateOne({ key: g.key }, { $set: g }, { upsert: true });
  console.log("Grades seeded");
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
