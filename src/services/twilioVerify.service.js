const twilio = require("twilio");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const sendOtp = async (phoneNumber) => {
  return await client.verify.v2
    .services(verifyServiceSid)
    .verifications.create({ to: phoneNumber, channel: "sms" });
};

const checkOtp = async (phoneNumber, code) => {
  return await client.verify.v2
    .services(verifyServiceSid)
    .verificationChecks.create({ to: phoneNumber, code });
};

module.exports = { sendOtp, checkOtp };