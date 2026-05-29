const AdminUser = require("../models/adminUserModel");
const User = require("../models/userModel");

const getUsers = async (req, res) => {
  try {
    const users = await AdminUser.findAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

const cleanupExpiredUnverifiedUsers = async (req, res) => {
  try {
    const deletedCount = await User.deleteExpiredUnverifiedUsers();

    return res.json({
      message: "Expired unverified accounts cleaned up",
      deletedCount,
    });
  } catch (err) {
    console.error("Error cleaning expired unverified users:", err);
    return res.status(500).json({ message: "Database error" });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ["admin", "users"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const affectedRows = await AdminUser.updateRole(req.params.id, role);
    if (affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User role updated" });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

const blockUser = async (req, res) => {
  try {
    const reason = req.body.reason?.toString().trim();

    if (!reason) {
      return res.status(400).json({ message: "Block reason is required." });
    }

    const affectedRows = await AdminUser.blockUser(req.params.id, reason);
    if (affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User blocked successfully" });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

const unblockUser = async (req, res) => {
  try {
    const affectedRows = await AdminUser.unblockUser(req.params.id);
    if (affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User unblocked successfully" });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await AdminUser.findRoleById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be deleted" });
    }

    const affectedRows = await AdminUser.deleteUser(req.params.id);
    if (affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

module.exports = {
  blockUser,
  cleanupExpiredUnverifiedUsers,
  deleteUser,
  getUsers,
  unblockUser,
  updateUserRole,
};
