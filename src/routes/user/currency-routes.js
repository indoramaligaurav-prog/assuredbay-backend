const express = require("express");
const router = express.Router();
const currency = require("../../controllers/user/currency-controller");
const apicache = require("apicache");
const cache = apicache.middleware;

router.get("/currencies", cache("5 minutes"), currency.getUserCurrencies);

module.exports = router;
