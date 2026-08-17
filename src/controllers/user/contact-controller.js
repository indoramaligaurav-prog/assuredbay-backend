const fs = require("fs");
const path = require("path");
const { sendEmail } = require("../../utils/mailer-util");

/*  Contact Message Send Email */
const createContactMessage = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    const htmlFilePath = path.join(
      process.cwd(),
      "src/email-templates",
      "contact.html"
    );
    let htmlContent = fs.readFileSync(htmlFilePath, "utf8");

    const fullName = `${firstName} ${lastName}`;
    htmlContent = htmlContent.replace(/{{name}}/g, fullName);
    htmlContent = htmlContent.replace(/{{email}}/g, email);
    htmlContent = htmlContent.replace(/{{phone}}/g, phone || "N/A");
    htmlContent = htmlContent.replace(/{{message}}/g, message);

    await sendEmail(
      "ha7011555@gmail.com",
      "📩 New Contact Message",
      htmlContent
    );

    return res.status(200).json({
      success: true,
      message: "Message sent successfully & email delivered",
    });
  } catch (error) {
    console.error("Error in createContactMessage:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

module.exports = { createContactMessage };
