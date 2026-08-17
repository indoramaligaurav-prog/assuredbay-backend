const User = require("../../models/User");
const Order = require("../../models/Order");
const AdminRole = require("../../models/AdminRole");
const Permission = require("../../models/Permission");

/*  Get all users managed by admin */
const getUsersByAdmin = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "", role } = req.query;
    const skip = parseInt(limit) * (parseInt(page) - 1) || 0;

    let query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      if (role === "admin") {
        query.role = { $in: ["admin", "super-admin"] };
      } else {
        query.role = role;
      }
    }

    const totalUserCounts = await User.countDocuments(query);

    const users = await User.find(query, null, {
      skip: skip,
      limit: parseInt(limit),
    }).sort({
      createdAt: -1,
    });
    const usersWithOrders = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({ "user._id": user._id });
        return { ...user.toObject(), totalOrders: orderCount };
      })
    );
    return res.status(200).json({
      success: true,
      data: usersWithOrders,
      count: Math.ceil(totalUserCounts / parseInt(limit)),
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*  Get orders of a user managed by admin */
const getUserOrdersByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, page = 1 } = req.query;
    const skip = parseInt(limit) * (parseInt(page) - 1) || 0;

    const currentUser = await User.findById(id);
    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    const totalOrders = await Order.countDocuments({ "user._id": id });
    const orders = await Order.find({ "user._id": id }, null, {
      skip: skip,
      limit: parseInt(limit),
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      user: currentUser,
      orders,
      count: Math.ceil(totalOrders / parseInt(limit)),
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*  Update a user's role by admin */
const updateUserRoleByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const userToUpdate = await User.findById(id);

    if (!userToUpdate) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found." });
    }

    if (userToUpdate.role === "super-admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot Change The Role Of A Super Admin.",
      });
    }

    const newRole = userToUpdate.role === "user" ? "admin" : "user";
    // 🚫 Vendor cannot become Admin
    if (userToUpdate.role === "vendor" && newRole === "admin") {
      return res.status(403).json({
        success: false,
        message: "A vendor cannot be assigned as admin.",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role: newRole },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: `${updatedUser.firstName} Is Now ${newRole}.`,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};


// GET /admin/permissions — grouped by module, for building the checkbox UI
const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ module: 1, action: 1 });
    return res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// GET /admin/roles
const getAdminRoles = async (req, res) => {
  try {
    const roles = await AdminRole.find().populate("permissions").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// GET /admin/roles/:id
const getOneAdminRole = async (req, res) => {
  try {
    const role = await AdminRole.findById(req.params.id).populate("permissions");
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });
    return res.status(200).json({ success: true, data: role });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /admin/roles
const createAdminRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Role name is required" });

    const role = await AdminRole.create({ name, description, permissions: permissions || [] });
    return res.status(201).json({ success: true, data: role });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "A role with this name already exists" });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /admin/roles/:id
const updateAdminRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await AdminRole.findByIdAndUpdate(
      req.params.id,
      { name, description, permissions },
      { new: true, runValidators: true }
    ).populate("permissions");

    if (!role) return res.status(404).json({ success: false, message: "Role not found" });
    return res.status(200).json({ success: true, data: role });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /admin/roles/:id
const deleteAdminRole = async (req, res) => {
  try {
    const inUse = await User.countDocuments({ adminRole: req.params.id });
    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — ${inUse} user(s) currently have this role assigned`,
      });
    }
    const role = await AdminRole.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });
    return res.status(200).json({ success: true, message: "Role deleted" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /admin/users/:id/role — assign a role to a staff user
const assignRoleToUser = async (req, res) => {
  try {
    const { adminRole } = req.body; // AdminRole _id, or null to unassign
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { adminRole: adminRole || null },
      { new: true }
    ).populate("adminRole");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};


module.exports = {
  getUsersByAdmin,
  getUserOrdersByAdmin,
  updateUserRoleByAdmin,
    getAllPermissions,
  getAdminRoles,
  getOneAdminRole,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  assignRoleToUser,
};
