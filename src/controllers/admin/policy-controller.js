const Policy = require("../../models/Policy");

/*  Create Policy */
const createPolicy = async (req, res) => {
  try {
    const { type, title, content } = req.body;

    const existingPolicy = await Policy.findOne({ type });
    if (existingPolicy) {
      return res.status(400).json({
        success: false,
        message: "Policy of this type already exists",
      });
    }

    const policy = await Policy.create({ type, title, content });
    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/*  Get All Policies (Admin) */
const getAllPolicies = async (req, res) => {
  try {
    const policies = await Policy.find();
    res.status(200).json({ success: true, data: policies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Update Policy */
const updatePolicy = async (req, res) => {
  try {
    const { type } = req.params;
    const { title, content } = req.body;

    const policy = await Policy.findOneAndUpdate(
      { type },
      { title, content },
      { new: true }
    );

    if (!policy) {
      return res
        .status(404)
        .json({ success: false, message: "Policy not found" });
    }

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Delete Policy */
const deletePolicy = async (req, res) => {
  try {
    const { type } = req.params;
    const policy = await Policy.findOneAndDelete({ type });

    if (!policy) {
      return res
        .status(404)
        .json({ success: false, message: "Policy not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Policy deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPolicy,
  getAllPolicies,
  updatePolicy,
  deletePolicy,
};
