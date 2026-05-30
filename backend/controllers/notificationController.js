const NotificationManager = require("../services/notificationManager");
const { parsePositiveInt } = require("../utils/sql");

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(100, parsePositiveInt(req.query.limit, 50));

    const notifications = await NotificationManager.getNotifications(userId, limit);
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await NotificationManager.getUnreadCount(userId);
    res.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const success = await NotificationManager.markAsRead(notificationId, userId);
    if (success) {
      return res.json({ message: "Notification marked as read" });
    }

    return res.status(404).json({ message: "Notification not found" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const affectedRows = await NotificationManager.markAllAsRead(userId);
    res.json({ message: `${affectedRows} notifications marked as read` });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Failed to mark notifications as read" });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
};
