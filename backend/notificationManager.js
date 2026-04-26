const db = require("./db");

class NotificationManager { 
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