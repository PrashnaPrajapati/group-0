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

  static markChatNotificationsAsRead(userId, conversationUserId, userRole) {
    return new Promise((resolve, reject) => {
      const messageFilter =
        userRole === "admin"
          ? "senderId = ?"
          : "senderId = ? AND receiverId = ?";
      const params =
        userRole === "admin"
          ? [userId, conversationUserId]
          : [userId, conversationUserId, userId];

      db.query(
        `SELECT id FROM notifications
         WHERE user_id = ?
           AND type = 'chat_message'
           AND is_read = FALSE
           AND related_id IN (
             SELECT id FROM messages WHERE ${messageFilter}
           )`,
        params,
        (selectErr, notifications) => {
          if (selectErr) {
            console.error("Error finding chat notifications:", selectErr);
            reject(selectErr);
            return;
          }

          const notificationIds = (notifications || []).map((row) => row.id);
          if (notificationIds.length === 0) {
            resolve({ affectedRows: 0, notificationIds: [] });
            return;
          }

          db.query(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND id IN (?)",
            [userId, notificationIds],
            (updateErr, result) => {
              if (updateErr) {
                console.error("Error marking chat notifications as read:", updateErr);
                reject(updateErr);
              } else {
                resolve({
                  affectedRows: result.affectedRows,
                  notificationIds,
                });
              }
            }
          );
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
