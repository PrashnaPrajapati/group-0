const db = require("./db");
const jwt = require("jsonwebtoken");

let onlineUsers = new Map(); 
let onlineAdmins = new Map(); 

/**
 * Initialize Socket.io handlers for chat
 * @param {Object} io - Socket.io server instance
 */
const initializeChat = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Register user/admin with JWT verification
    socket.on("register_user", (data) => {
      try {
        const { userId, token } = data;
        
        // Verify JWT token for security
        try {
          const decoded = jwt.verify(token, process.env.SECRET_KEY);
          if (decoded.id !== userId || decoded.role !== "users") {
            return socket.emit("error", { message: "Invalid token or role" });
          }
        } catch (err) {
          return socket.emit("error", { message: "Unauthorized" });
        }

        // Store user connection
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.userRole = "users";
        
        console.log(`User ${userId} registered with socket ${socket.id}`);
        
        // Notify admins that a user is online
        io.emit("user_online", { userId, isOnline: true });

        // Send currently online admin list to this user
        socket.emit("admin_list", { adminIds: Array.from(onlineAdmins.keys()) });
      } catch (error) {
        console.error("Error registering user:", error);
        socket.emit("error", { message: "Registration failed" });
      }
    });

    socket.on("register_admin", (data) => {
      try {
        const { adminId, token } = data;
        
        // Verify JWT token for security
        try {
          const decoded = jwt.verify(token, process.env.SECRET_KEY);
          if (decoded.id !== adminId || decoded.role !== "admin") {
            return socket.emit("error", { message: "Invalid token or role" });
          }
        } catch (err) {
          return socket.emit("error", { message: "Unauthorized" });
        }

        // Store admin connection
        onlineAdmins.set(adminId, socket.id);
        socket.userId = adminId;
        socket.userRole = "admin";
        
        console.log(`Admin ${adminId} registered with socket ${socket.id}`);
      } catch (error) {
        console.error("Error registering admin:", error);
        socket.emit("error", { message: "Registration failed" });
      }
    });

    // Request message history
    socket.on("request_history", (data) => {
      try {
        const { conversationUserId } = data;
        const currentUserId = socket.userId;
        
        if (!currentUserId) {
          return socket.emit("error", { message: "Not registered" });
        }

        // Fetch messages from database
        const query = `
          SELECT id, senderId, receiverId, message, isRead, timestamp
          FROM messages
          WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
          ORDER BY timestamp ASC
          LIMIT 100
        `;

        db.query(
          query,
          [currentUserId, conversationUserId, conversationUserId, currentUserId],
          (err, results) => {
            if (err) {
              console.error("Error fetching history:", err);
              return socket.emit("error", { message: "Failed to load history" });
            }

            const normalized = (results || []).map((record) => ({
              id: record.id,
              sender_id: record.senderId,
              receiver_id: record.receiverId,
              sender_role: record.sender_role || (record.senderId && record.receiverId ? (record.senderId === currentUserId ? "users" : "admin") : "users"),
              message_text: record.message || record.message_text,
              is_read: Boolean(record.isRead || record.is_read),
              created_at: record.timestamp || record.created_at,
            }));

            socket.emit("message_history", {
              messages: normalized,
              conversationUserId,
            });

            // Mark messages as read
            markMessagesAsRead(currentUserId, conversationUserId);
          }
        );
      } catch (error) {
        console.error("Error requesting history:", error);
        socket.emit("error", { message: "Error loading history" });
      }
    });

    // Handle incoming messages
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

        // Save message to database
        const query = `
          INSERT INTO messages (senderId, receiverId, message, timestamp, isRead)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0)
        `;

        db.query(
          query,
          [senderId, receiverId, message.trim()],
          (err, result) => {
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

            // Send to receiver based on role
            const receiverSocketId =
              senderRole === "users"
                ? onlineAdmins.get(receiverId)
                : onlineUsers.get(receiverId);

            if (receiverSocketId) {
              io.to(receiverSocketId).emit("receive_message", messageData);
            }

            // Confirm message was sent
            socket.emit("message_sent", messageData);
          }
        );
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Error sending message" });
      }
    });

    // Mark messages as read
    socket.on("mark_as_read", (data) => {
      try {
        const { conversationUserId } = data;
        const currentUserId = socket.userId;

        if (!currentUserId) return;

        markMessagesAsRead(currentUserId, conversationUserId);
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    });

    // Get list of users (for admin to see who they can chat with)
    socket.on("get_users", () => {
      try {
        if (socket.userRole !== "admin") {
          return socket.emit("error", { message: "Only admins can request users list" });
        }

        db.query(
          `SELECT id, fullName, photoUrl, gender FROM users WHERE role = 'users' ORDER BY fullName`,
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

    // Disconnect handler
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

/**
 * Mark messages as read in database
 */
function markMessagesAsRead(currentUserId, senderUserId) {
  const query = `
    UPDATE messages
    SET isRead = TRUE
    WHERE receiverId = ? AND senderId = ? AND isRead = FALSE
  `;

  db.query(query, [currentUserId, senderUserId], (err) => {
    if (err) console.error("Error marking as read:", err);
  });
}

/**
 * Get user info by ID
 */
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
