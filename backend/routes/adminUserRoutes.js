const express = require("express");
const {
  blockUser,
  cleanupExpiredUnverifiedUsers,
  deleteUser,
  getUsers,
  unblockUser,
  updateUserRole,
} = require("../controllers/adminUserController");
const { verifyAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/admin/users", verifyAdmin, getUsers);
router.delete("/admin/users/unverified-expired", verifyAdmin, cleanupExpiredUnverifiedUsers);
router.put("/admin/users/:id/role", verifyAdmin, updateUserRole);
router.put("/admin/users/:id/block", verifyAdmin, blockUser);
router.post("/admin/users/:id/block", verifyAdmin, blockUser);
router.put("/admin/users/:id/unblock", verifyAdmin, unblockUser);
router.post("/admin/users/:id/unblock", verifyAdmin, unblockUser);
router.delete("/admin/users/:id", verifyAdmin, deleteUser);

module.exports = router;
