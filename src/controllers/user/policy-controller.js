const Policy = require("../../models/Policy");

/*  Get Single Policy (Public) */
const getPolicyByType = async (req, res) => {
  try {
    const { type } = req.params;
    const policy = await Policy.findOne({ type });

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

module.exports = {
  getPolicyByType,
};
