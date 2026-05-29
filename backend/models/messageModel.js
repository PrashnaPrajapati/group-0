const db = require("../db");

const getUnreadCount = async (userId) => {
  const [rows] = await db.promise().query(
    "SELECT COUNT(*) AS unreadCount FROM messages WHERE receiverId = ? AND isRead = FALSE",
    [userId]
  );

  return rows[0]?.unreadCount || 0;
};

const getAdminUnreadCounts = async (adminId) => {
  const [rows] = await db.promise().query(
    `SELECT senderId AS userId, COUNT(*) AS unreadCount
     FROM messages
     WHERE isRead = FALSE
       AND senderId IN (SELECT id FROM users WHERE role = 'users')
       AND (
         receiverId = ?
         OR receiverId = 999999
         OR receiverId IN (SELECT id FROM users WHERE role = 'admin')
       )
     GROUP BY senderId`,
    [adminId]
  );

  return rows;
};

module.exports = {
  getAdminUnreadCounts,
  getUnreadCount,
};
