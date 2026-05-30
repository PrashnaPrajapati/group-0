const db = require("../db");
const { parsePositiveInt } = require("../utils/sql");

class NotificationManager {
  static async ensureNotificationsTable() {
    await db.promise().query(
      `CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        related_id INT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notifications_user_read (user_id, is_read),
        INDEX idx_notifications_type_related (type, related_id)
      )`
    );

    try {
      await db.promise().query("ALTER TABLE notifications MODIFY type VARCHAR(50) NOT NULL");
      await db.promise().query("ALTER TABLE notifications MODIFY related_id INT NULL");
      await db.promise().query("ALTER TABLE notifications MODIFY is_read BOOLEAN DEFAULT FALSE");
    } catch (error) {
      console.error("Error updating notifications table schema:", error.message);
    }
  }

  static async createNotification(userId, title, message, type, relatedId = null) {
    await this.ensureNotificationsTable();
    const [result] = await db.promise().query(
      "INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)",
      [userId, title, message, type, relatedId]
    );

    return result.insertId;
  }

  static async notificationExists(userId, type, relatedId) {
    await this.ensureNotificationsTable();
    const [rows] = await db.promise().query(
      "SELECT id FROM notifications WHERE user_id = ? AND type = ? AND related_id <=> ? LIMIT 1",
      [userId, type, relatedId]
    );

    return Boolean(rows[0]);
  }

  static async getNotifications(userId, limit = 50) {
    await this.ensureNotificationsTable();
    const safeLimit = Math.min(100, parsePositiveInt(limit, 50));
    const [rows] = await db.promise().query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      [userId, safeLimit]
    );

    return rows;
  }

  static async markAsRead(notificationId, userId) {
    await this.ensureNotificationsTable();
    const [result] = await db.promise().query(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      [notificationId, userId]
    );

    return result.affectedRows > 0;
  }

  static async markAllAsRead(userId) {
    await this.ensureNotificationsTable();
    const [result] = await db.promise().query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE",
      [userId]
    );

    return result.affectedRows;
  }

  static async markChatNotificationsAsRead(userId, conversationUserId, userRole) {
    await this.ensureNotificationsTable();

    const [notifications] =
      userRole === "admin"
        ? await db.promise().query(
            `SELECT id FROM notifications
             WHERE user_id = ?
               AND type = 'chat_message'
               AND is_read = FALSE
               AND related_id IN (
                 SELECT id FROM messages WHERE senderId = ?
               )`,
            [userId, conversationUserId]
          )
        : await db.promise().query(
            `SELECT id FROM notifications
             WHERE user_id = ?
               AND type = 'chat_message'
               AND is_read = FALSE
               AND related_id IN (
                 SELECT id FROM messages WHERE senderId = ? AND receiverId = ?
               )`,
            [userId, conversationUserId, userId]
          );

    const notificationIds = (notifications || []).map((row) => row.id);
    if (notificationIds.length === 0) {
      return { affectedRows: 0, notificationIds: [] };
    }

    const [result] = await db.promise().query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND id IN (?)",
      [userId, notificationIds]
    );

    return {
      affectedRows: result.affectedRows,
      notificationIds,
    };
  }

  static async getUnreadCount(userId) {
    await this.ensureNotificationsTable();
    const [rows] = await db.promise().query(
      "SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [userId]
    );

    return rows[0]?.unread_count || 0;
  }

  static async deleteOldNotifications(daysOld = 30) {
    await this.ensureNotificationsTable();
    const safeDaysOld = parsePositiveInt(daysOld, 30);
    const [result] = await db.promise().query(
      "DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)",
      [safeDaysOld]
    );

    return result.affectedRows;
  }
}

module.exports = NotificationManager;
