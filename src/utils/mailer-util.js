const nodemailer = require("nodemailer");
const Settings = require("../models/Settings"); // adjust path

// Get SMTP Config from DB
async function getSMTPConfig() {
  const settings = await Settings.findOne({ "general.smtp.isActive": true });

  if (!settings || !settings.general || !settings.general.smtp) {
    throw new Error("SMTP configuration not found in DB");
  }

  return settings.general.smtp; // { host, port, user, password, secure, fromEmail }
}

//  Send Email Function
async function sendEmail(to, subject, html) {
  const smtp = await getSMTPConfig();

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure, // true = 465, false = other ports
    auth: {
      user: smtp.user,
      pass: smtp.password,
    },
  });

  const mailOptions = {
    from: smtp.fromEmail || smtp.user,
    to,
    subject,
    html,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };
