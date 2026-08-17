const crypto = require("crypto");
const axios = require("axios");

const SUMSUB_APP_TOKEN = "YOUR_APP_TOKEN";
const SUMSUB_SECRET = "YOUR_SECRET_KEY";

const BASE_URL = "https://api.sumsub.com";

// 🔐 Generate signature
const createSignature = (ts, method, path, body = "") => {
  const hmac = crypto.createHmac("sha256", SUMSUB_SECRET);
  hmac.update(ts + method + path + body);
  return hmac.digest("hex");
};

// 🎫 Create applicant + token
const createApplicantToken = async (userId) => {
  try {
    const ts = Math.floor(Date.now() / 1000).toString();

    const path = `/resources/accessTokens?userId=${userId}&externalUserId=${userId}&ttlInSecs=600`;
    const method = "POST";

    const signature = createSignature(ts, method, path);

    const headers = {
      "X-App-Token": SUMSUB_APP_TOKEN,
      "X-App-Access-Sig": signature,
      "X-App-Access-Ts": ts,
    };

    const response = await axios.post(BASE_URL + path, {}, { headers });

    return response.data.token;

  } catch (err) {
    console.log("Sumsub Error:", err.response?.data || err.message);
    throw new Error("KYC token generation failed");
  }
};

module.exports = { createApplicantToken };