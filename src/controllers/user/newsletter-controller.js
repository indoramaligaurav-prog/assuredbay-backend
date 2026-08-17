const Newsletter = require("../../models/Newsletter");

/*  Create Newsletter Entry */
const createNewsletter = async (req, res) => {
  try {
    await Newsletter.create({
      email: req.body.email,
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Newsletter Added",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  createNewsletter,
};
