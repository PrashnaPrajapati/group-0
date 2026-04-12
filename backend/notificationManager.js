const db = require("./db");

class NotificationManager {
  // Create a notification
  static createNotification(userId, title, message, type, relatedId = null) {
    return new Promise((resolve, reject) => {
      db.query(
        "INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)",
        [userId, title, message, type, relatedId],
        (err, result) => {
          if (err) {
            console.error("Error creating notification:", err);
            reject(err);
          } else {
            resolve(result.insertId);
          }
        }
      );
    });
  }

  // Get notifications for a user
  static getNotifications(userId, limit = 50) {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        [userId, limit],
        (err, results) => {
          if (err) {
            console.error("Error fetching notifications:", err);
            reject(err);
          } else {
            resolve(results);
          }
        }
      );
    });
  }

  // Mark notification as read
  static markAsRead(notificationId, userId) {
    return new Promise((resolve, reject) => {
      db.query(
        "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
        [notificationId, userId],
        (err, result) => {
          if (err) {
            console.error("Error marking notification as read:", err);
            reject(err);
          } else {
            resolve(result.affectedRows > 0);
          }
        }
      );
    });
  }

  // Mark all notifications as read for a user
  static markAllAsRead(userId) {
    return new Promise((resolve, reject) => {
      db.query(
        "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE",
        [userId],
        (err, result) => {
          if (err) {
            console.error("Error marking all notifications as read:", err);
            reject(err);
          } else {
            resolve(result.affectedRows);
          }
        }
      );
    });
  }

  // Get unread count
  static getUnreadCount(userId) {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE",
        [userId],
        (err, results) => {
          if (err) {
            console.error("Error getting unread count:", err);
            reject(err);
          } else {
            resolve(results[0].unread_count);
          }
        }
      );
    });
  }

  // Delete old notifications (cleanup function)
  static deleteOldNotifications(daysOld = 30) {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)",
        [daysOld],
        (err, result) => {
          if (err) {
            console.error("Error deleting old notifications:", err);
            reject(err);
          } else {
            resolve(result.affectedRows);
          }
        }
      );
    });
  }
}

module.exports = NotificationManager;