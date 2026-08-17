"use strict";
require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const recachegoose = require("recachegoose");
const routes = require("./routes/routeLoader");
const initializeDefaults = require("./startup/initializer");
const priceHydrator = require("./middlewares/priceHydrator");
const startCron = require('./startup/cron');
const startKycCron = require("./startup/kycCron");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

app.use("/api/webhook", require("./routes/webhookRoutes"));

app.use(bodyParser.json());
app.use(routes);
app.use(priceHydrator);


app.use("/uploads", express.static("uploads"));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    recachegoose(mongoose, {
      engine: "memory",
      ttl: 60,
    });

    const initialized = await initializeDefaults();
    if (initialized) {
      console.log(" Default settings/data created successfully.");
    } else {
      console.log(" Default settings/data already exist, no new data created.");
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });
// GET API
app.get("/", (req, res) => {
  res.send("This is a GET API");
});

startCron();
// startKycCron();




// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
