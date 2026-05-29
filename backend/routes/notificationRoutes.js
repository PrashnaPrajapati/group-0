const express = require("express");
const {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} = require("../controllers/notificationController");
const { verifyUser } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/notifications", verifyUser, getNotifications);
router.get("/notifications/unread-count", verifyUser, getUnreadCount);
router.put("/notifications/mark-all-read", verifyUser, markAllAsRead);
router.put("/notifications/:id/read", verifyUser, markAsRead);

module.exports = router;
