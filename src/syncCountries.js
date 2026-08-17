require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

// Change if needed
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = "assurebay";
const COLLECTION = "countries";

// Path to the countries.json file (place it next to this script, or update the path below)
const JSON_FILE = path.join(__dirname, "countries.json");

async function updateCountryCurrency() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ MongoDB Connected");

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    if (!fs.existsSync(JSON_FILE)) {
      throw new Error(`countries.json not found at ${JSON_FILE}`);
    }

    const raw = fs.readFileSync(JSON_FILE, "utf-8");
    const countries = JSON.parse(raw);

    console.log(`Loaded ${countries.length} countries from JSON file`);

    let matched = 0;
    let modified = 0;
    let notFound = [];

    for (const country of countries) {
      const { code, currency, currency_symbol } = country;

      if (!code) continue;

      const result = await collection.updateOne(
        { code },
        {
          $set: {
            currency: currency || "",
            currency_symbol: currency_symbol || "",
            updatedAt: new Date()
          }
        }
        // no upsert — we only want to update EXISTING documents, not create new ones
      );

      if (result.matchedCount) {
        matched++;
      } else {
        notFound.push(code);
      }

      if (result.modifiedCount) {
        modified++;
      }
    }

    console.log("------------------------");
    console.log(`Matched existing docs : ${matched}`);
    console.log(`Modified              : ${modified}`);
    console.log(`Total JSON countries  : ${countries.length}`);
    console.log(
      "Total Mongo countries  :",
      await collection.countDocuments()
    );

    if (notFound.length) {
      console.log("------------------------");
      console.log(`⚠️  Codes in JSON but NOT found in '${COLLECTION}':`);
      console.log(notFound.join(", "));
    }

    console.log("✅ Update Completed");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.close();
  }
}

updateCountryCurrency();