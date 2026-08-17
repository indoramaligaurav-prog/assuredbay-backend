// const cron = require("node-cron");
// const Shop = require("../models/Shop");
// const kycRules = require("../constants/kycRules");

// const { extractText, cleanText, extractName, isFakeDocument } = require("../utils/kycUtil");

// module.exports = () => {
//   cron.schedule("*/1 * * * *", async () => {
//     console.log("⏰ KYC Cron Running...");

//     try {
//       const shops = await Shop.find({
//         kycStatus: "pending"
//       }).limit(5);


//       console.log("Pending Shops:", shops.length);

//      for (let shop of shops) {

//   console.log("⚙ Processing:", shop.name);

//       // 🔒 LOCK
//       const updated = await Shop.findOneAndUpdate(
//         { _id: shop._id, kycStatus: "pending" },
//         { $set: { kycStatus: "processing" } },
//         { new: true }
//       );

//   if (!updated) continue;

//   try {

//    // 🔥 REAL KYC LOGIC START

// let totalScore = 0;
// let maxScore = 0;

// for (let doc of updated.identityVerification) {

//   console.log("📄 Checking:", doc.title);

//   const filePath = "." + doc.url;

//   const rawText = await extractText(filePath);
//   const text = cleanText(rawText);

//   const detectDocumentType = (text) => {
//   if (text.includes("INCOME TAX")) return "PAN";
//   if (text.includes("AADHAAR")) return "AADHAR";
//   if (text.includes("PASSPORT")) return "PASSPORT";
//   if (text.includes("DRIVING LICENCE")) return "DRIVING_LICENSE";

//   if (text.includes("BANK") && text.includes("STATEMENT")) return "BANK_STATEMENT";
//   if (text.includes("ELECTRICITY") || text.includes("WATER")) return "UTILITY_BILL";

//   if (text.includes("GSTIN")) return "GST";
//   if (text.includes("TRADE LICENSE")) return "TRADE_LICENSE";

//   return "UNKNOWN";
// };

//   let docScore = 0;

//   // 🔹 OCR success
//   if (text && text.length > 20) {
//     docScore += 20;
//   }

// const rule = kycRules[detectedType] || kycRules[doc.title];

//   // 🔹 Regex validation
//   if (rule && rule.regex) {
//     const match = text.match(rule.regex);

//     if (match) {
//       docScore += 40;
//       console.log("✅ Regex match:", match[0]);
//     } else {
//       console.log("❌ Regex failed");
//     }
//   }

//   if (rule && rule.keywords) {
//   let matches = 0;

//   rule.keywords.forEach(k => {
//     if (text.includes(k)) matches++;
//   });

//   const keywordScore = (matches / rule.keywords.length) * 20;
//   docScore += keywordScore;

//   console.log("🔍 Keyword Score:", keywordScore);
// }


// const extractedName = extractName(text);

// if (extractedName && updated.name) {
//   if (extractedName.includes(updated.name.toUpperCase())) {
//     docScore += 20;
//     console.log("✅ Name matched");
//   }
// }

// if (isFakeDocument(text)) {
//   docScore -= 30;
//   console.log("🚨 Fake document suspected");
// }

// const allowedTypes = [".jpg", ".jpeg", ".png", ".pdf"];

// if (!allowedTypes.some(ext => filePath.toLowerCase().endsWith(ext))) {
//   console.log("❌ Invalid file type");
//   continue;
// }

//   // 🔹 Text quality
//   if (text.length > 50) {
//     docScore += 20;
//   }

//   // 🔹 Name match (basic)
//   if (updated.name) {
//     const shopName = updated.name.toUpperCase();

//     if (text.includes(shopName)) {
//       docScore += 20;
//       console.log("✅ Name matched");
//     }
//   }

//   console.log(`📊 Doc Score (${doc.title}):`, docScore);

//   totalScore += docScore;
//   maxScore += 100;
// }


// // 🎯 FINAL DECISION
// const finalScore = (totalScore / maxScore) * 100;

// console.log("🎯 Final Score:", finalScore);

// const totalDocs = updated.identityVerification.length;

// if (finalScore >= 75 && totalDocs >= 2) {
//   updated.kycStatus = "approved";
//   updated.status = "approved";
// }
// else if (finalScore >= 50) {
//   updated.kycStatus = "manual_review";
//   updated.status = "in review";
// }
// else {
//   updated.kycStatus = "rejected";
//   updated.status = "action required";
// }

// updated.kycProcessedAt = new Date();

// await updated.save();

// // 🔥 REAL KYC LOGIC END

//   } catch (err) {

//     console.log("❌ Error:", updated.name);

//     updated.kycStatus = "rejected";
//     updated.status = "action required";

//     await updated.save();
//   }
// }


//     } catch (error) {
//       console.log("Cron Error:", error);
//     }
//   });
// };