const { sendOtp, checkOtp } = require("../../services/twilioVerify.service");

exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    await sendOtp(phoneNumber);

    return res.status(200).json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("sendPhoneOtp error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Failed to send OTP" });
  }
};

exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
      return res.status(400).json({ success: false, message: "Phone number and code are required" });
    }

    const result = await checkOtp(phoneNumber, code);

    if (result.status !== "approved") {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    return res.status(200).json({ success: true, message: "Phone verified" });
  } catch (err) {
    console.error("verifyPhoneOtp error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Failed to verify OTP" });
  }
};