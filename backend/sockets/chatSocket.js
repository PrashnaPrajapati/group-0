const db = require("../db");
const jwt = require("jsonwebtoken");

let onlineUsers = new Map(); 
let onlineAdmins = new Map(); 
 
const initializeChat = (io, notificationService = null) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
 
    socket.on("register_user", (data) => {
      try {
        const { userId, token } = data;
         
        try {
          const decoded = jwt.verify(token, process.env.SECRET_KEY);
          if (decoded.id !== userId || decoded.role !== "users") {
            return socket.emit("error", { message: "Invalid token or role" });
          }
        } catch (err) {
          return socket.emit("error", { message: "Unauthorized" });
        }
 
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.userRole = "users";
        
        console.log(`User ${userId} registered with socket ${socket.id}`);
         
        io.emit("user_online", { userId, isOnline: true });
 
        db.query(
          "SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC",
          (err, results) => {
            let adminIds = [];
            if (!err && results && results.length > 0) {
              adminIds = results.map((row) => row.id);
              console.log(`📤 Found ${adminIds.length} admin(s):`, adminIds);
            } else {
              console.log("⚠️ No admins found in database or error:", err?.message);
            }
            console.log(`📤 Sending admin_list to user ${userId}:`, adminIds);
            socket.emit("admin_list", { adminIds });
          }
        );
      } catch (error) {
        console.error("Error registering user:", error);
        socket.emit("error", { message: "Registration failed" });
      }
    });

    socket.on("register_admin", (data) => {
      try {
        const { adminId, token } = data;
    
        try {
          const decoded = jwt.verify(token, process.env.SECRET_KEY);
          if (decoded.id !== adminId || decoded.role !== "admin") {
            return socket.emit("error", { message: "Invalid token or role" });
          }
        } catch (err) {
          return socket.emit("error", { message: "Unauthorized" });
        }
 
        onlineAdmins.set(adminId, socket.id);
        socket.userId = adminId;
        socket.userRole = "admin";
        
        console.log(`Admin ${adminId} registered with socket ${socket.id}`);
      } catch (error) {
        console.error("Error registering admin:", error);
        socket.emit("error", { message: "Registration failed" });
      }
    });
 
    socket.on("request_history", (data) => {
      try {
        const { conversationUserId } = data;
        const currentUserId = socket.userId;
        const currentRole = socket.userRole;
        
        console.log("📥 request_history - currentUserId:", currentUserId, "role:", currentRole, "conversationUserId:", conversationUserId);
        
        if (!currentUserId) {
          return socket.emit("error", { message: "Not registered" });
        }
 
        let query = ``;
        let params = [];

        if (conversationUserId === 999999 && currentRole === "admin") { 
          query = `
            SELECT id, senderId, receiverId, message, isRead, timestamp
            FROM messages
            WHERE receiverId = 999999
            ORDER BY timestamp ASC
            LIMIT 100
          `;
          params = [];
        } else if (currentRole === "admin") { 
          query = `
            SELECT id, senderId, receiverId, message, isRead, timestamp
            FROM messages
            WHERE (senderId = ? AND (receiverId = ? OR receiverId = 999999 OR receiverId IN (SELECT id FROM users WHERE role = 'admin')))
            OR (senderId = ? AND receiverId = ?)
            ORDER BY timestamp ASC
            LIMIT 100
          `;
          params = [conversationUserId, currentUserId, currentUserId, conversationUserId];
        } else { 
          query = `
            SELECT id, senderId, receiverId, message, isRead, timestamp
            FROM messages
            WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
            ORDER BY timestamp ASC
            LIMIT 100
          `;
          params = [currentUserId, conversationUserId, conversationUserId, currentUserId];
        }

        db.query(
          query,
          params,
          (err, results) => {
            if (err) {
              console.error("Error fetching history:", err);
              return socket.emit("error", { message: "Failed to load history" });
            }

            console.log("📊 History query results count:", results ? results.length : 0);

            const normalized = (results || []).map((record) => ({
              id: record.id,
              sender_id: record.senderId,
              receiver_id: record.receiverId,
              sender_role: record.sender_role || (record.senderId && record.receiverId ? (record.senderId === currentUserId ? "users" : "admin") : "users"),
              message_text: record.message || record.message_text,
              is_read: Boolean(record.isRead || record.is_read),
              created_at: record.timestamp || record.created_at,
            }));

            console.log("📤 Emitting message_history with", normalized.length, "messages");
            socket.emit("message_history", {
              messages: normalized,
              conversationUserId,
            });
 
            markMessagesAsRead(currentUserId, conversationUserId, currentRole);
            if (notificationService) {
              notificationService.markChatNotificationsAsRead(
                currentUserId,
                conversationUserId,
                currentRole
              );
            }
          }
        );
      } catch (error) {
        console.error("Error requesting history:", error);
        socket.emit("error", { message: "Error loading history" });
      }
    });
 
    socket.on("send_message", (data) => {
      try {
        const { receiverId, message } = data;
        const senderId = socket.userId;
        const senderRole = socket.userRole;

        if (!senderId || !senderRole) {
          return socket.emit("error", { message: "Not registered" });
        }

        if (!message || !message.trim()) {
          return socket.emit("error", { message: "Empty message" });
        }
 
        const query = `
          INSERT INTO messages (senderId, receiverId, message, timestamp, isRead)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0)
        `;

        db.query(
          query,
          [senderId, receiverId, message.trim()],
          async (err, result) => {
            if (err) {
              console.error("Error saving message:", err);
              return socket.emit("error", { message: "Failed to send message" });
            }

            const messageData = {
              id: result.insertId,
              sender_id: senderId,
              receiver_id: receiverId,
              sender_role: senderRole,
              message_text: message.trim(),
              is_read: false,
              created_at: new Date().toISOString(),
            };
 
            console.log("📨 Message from", senderRole, senderId, "to", receiverId);
            
            if (senderRole === "users") {
              console.log("📢 Broadcasting to all", onlineAdmins.size, "online admins");
              for (let [adminId, adminSocketId] of onlineAdmins.entries()) {
                io.to(adminSocketId).emit("receive_message", messageData);
                console.log("   ✉️  Sent to admin", adminId);
              }
            } else {
              const receiverSocketId = onlineUsers.get(receiverId);
              if (receiverSocketId) {
                io.to(receiverSocketId).emit("receive_message", messageData);
                console.log("   ✉️  Sent to user", receiverId);
              }
            }

            try {
              if (notificationService) {
                const senderInfo = await getUserInfo(senderId);
                const senderName = senderInfo?.fullName || (senderRole === "admin" ? "Admin" : "User");

                if (senderRole === "users") {
                  await notificationService.sendNotificationToAdmins(
                    `New message from ${senderName}`,
                    messageData.message_text,
                    "chat_message",
                    messageData.id
                  );
                } else {
                  await notificationService.sendNotificationToUser(
                    receiverId,
                    `New message from Admin`,
                    messageData.message_text,
                    "chat_message",
                    messageData.id
                  );
                }
              }
            } catch (notifyErr) {
              console.error("Error creating chat notification:", notifyErr);
            }

            socket.emit("message_sent", messageData);
          }
        );
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Error sending message" });
      }
    });
 
    socket.on("mark_as_read", (data) => {
      try {
        const { conversationUserId } = data;
        const currentUserId = socket.userId;

        if (!currentUserId) return;

        markMessagesAsRead(currentUserId, conversationUserId, socket.userRole);
        if (notificationService) {
          notificationService.markChatNotificationsAsRead(
            currentUserId,
            conversationUserId,
            socket.userRole
          );
        }
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    });
 
    socket.on("get_users", () => {
      try {
        if (socket.userRole !== "admin") {
          return socket.emit("error", { message: "Only admins can request users list" });
        }

        db.query(
          `SELECT
             u.id,
             u.fullName,
             u.photoUrl,
             u.gender,
             latest.lastMessageAt,
             latest.lastMessage
           FROM users u
           LEFT JOIN (
             SELECT
               conversation.userId,
               MAX(m.timestamp) AS lastMessageAt,
               SUBSTRING_INDEX(
                 GROUP_CONCAT(m.message ORDER BY m.timestamp DESC SEPARATOR '|||'),
                 '|||',
                 1
               ) AS lastMessage
             FROM (
               SELECT senderId AS userId, id FROM messages WHERE senderId IN (SELECT id FROM users WHERE role = 'users')
               UNION ALL
               SELECT receiverId AS userId, id FROM messages WHERE receiverId IN (SELECT id FROM users WHERE role = 'users')
             ) conversation
             JOIN messages m ON m.id = conversation.id
             GROUP BY conversation.userId
           ) latest ON latest.userId = u.id
           WHERE u.role = 'users'
           ORDER BY latest.lastMessageAt IS NULL, latest.lastMessageAt DESC, u.fullName ASC`,
          (err, results) => {
            if (err) {
              console.error("Error fetching users:", err);
              return socket.emit("error", { message: "Failed to load users" });
            }

            socket.emit("users_list", {
              users: results || [],
              onlineUsers: Array.from(onlineUsers.keys()),
            });
          }
        );
      } catch (error) {
        console.error("Error getting users:", error);
        socket.emit("error", { message: "Error loading users" });
      }
    });
 
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (socket.userId) {
        if (socket.userRole === "users") {
          onlineUsers.delete(socket.userId);
          io.emit("user_online", { userId: socket.userId, isOnline: false });
        } else if (socket.userRole === "admin") {
          onlineAdmins.delete(socket.userId);
        }
      }
    });
  });
};
 
function markMessagesAsRead(currentUserId, senderUserId, currentRole) {
  const isAdmin = currentRole === "admin";
  const query = isAdmin
    ? `
      UPDATE messages
      SET isRead = TRUE
      WHERE senderId = ?
        AND isRead = FALSE
        AND (
          receiverId = ?
          OR receiverId = 999999
          OR receiverId IN (SELECT id FROM users WHERE role = 'admin')
        )
    `
    : `
      UPDATE messages
      SET isRead = TRUE
      WHERE receiverId = ? AND senderId = ? AND isRead = FALSE
    `;
  const params = isAdmin ? [senderUserId, currentUserId] : [currentUserId, senderUserId];

  db.query(query, params, (err) => {
    if (err) console.error("Error marking as read:", err);
  });
}
 
const getUserInfo = (userId) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT id, fullName, photoUrl, role FROM users WHERE id = ?",
      [userId],
      (err, results) => {
        if (err) reject(err);
        else resolve(results[0] || null);
      }
    );
  });
};

module.exports = {
  initializeChat,
  onlineUsers,
  onlineAdmins,
  getUserInfo,
};
