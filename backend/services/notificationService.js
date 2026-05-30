const NotificationManager = require("./notificationManager");
const db = require("../db");

class NotificationService {
  constructor(io) {
    this.io = io;
    this.setupSocketListeners();
    this.startReminderScheduler();
  }

  // Setup Socket.IO listeners for real-time notifications
  setupSocketListeners() {
    this.io.on("connection", (socket) => {
      console.log("Notification service: User connected:", socket.id);

      // Register user for notifications
      socket.on("register_for_notifications", (data) => {
        try {
          const { userId, role } = data;
          socket.userId = userId;
          socket.userRole = role;

          // Join user-specific room
          socket.join(`user_${userId}`);

          // Join admin room if admin
          if (role === "admin") {
            socket.join("admin_room");
          }

          console.log(`User ${userId} registered for notifications`);
        } catch (error) {
          console.error("Error registering for notifications:", error);
        }
      });

      // Mark notification as read
      socket.on("mark_notification_read", async (data) => {
        try {
          const { notificationId } = data;
          const userId = socket.userId;

          if (!userId) return;

          await NotificationManager.markAsRead(notificationId, userId);

          // Emit updated unread count
          const unreadCount = await NotificationManager.getUnreadCount(userId);
          socket.emit("notification_count_updated", { unreadCount });
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      });

      // Mark all notifications as read
      socket.on("mark_all_notifications_read", async () => {
        try {
          const userId = socket.userId;

          if (!userId) return;

          await NotificationManager.markAllAsRead(userId);

          // Emit updated unread count
          socket.emit("notification_count_updated", { unreadCount: 0 });
        } catch (error) {
          console.error("Error marking all notifications as read:", error);
        }
      });
    });
  }

  async markChatNotificationsAsRead(userId, conversationUserId, userRole) {
    try {
      const result = await NotificationManager.markChatNotificationsAsRead(
        userId,
        conversationUserId,
        userRole
      );
      const unreadCount = await NotificationManager.getUnreadCount(userId);

      if (result.notificationIds.length > 0) {
        this.io.to(`user_${userId}`).emit("chat_notifications_read", {
          notificationIds: result.notificationIds,
          unreadCount,
        });
      } else {
        this.io.to(`user_${userId}`).emit("notification_count_updated", { unreadCount });
      }

      return result;
    } catch (error) {
      console.error("Error marking chat notifications as read:", error);
      return { affectedRows: 0, notificationIds: [] };
    }
  }

  // Send notification to specific user
  async sendNotificationToUser(userId, title, message, type, relatedId = null) {
    try {
      // Create notification in database
      const notificationId = await NotificationManager.createNotification(
        userId,
        title,
        message,
        type,
        relatedId
      );

      // Get unread count
      const unreadCount = await NotificationManager.getUnreadCount(userId);

      // Emit to user's room
      this.io.to(`user_${userId}`).emit("new_notification", {
        id: notificationId,
        title,
        message,
        type,
        relatedId,
        isRead: false,
        createdAt: new Date(),
        unreadCount
      });

      console.log(`Notification sent to user ${userId}: ${title}`);
    } catch (error) {
      console.error("Error sending notification to user:", error);
    }
  }

  // Send notification to all admins
  async sendNotificationToAdmins(title, message, type, relatedId = null) {
    try {
      // Get all admin users
      const admins = await this.getAllAdmins();

      for (const admin of admins) {
        await this.sendNotificationToUser(admin.id, title, message, type, relatedId);
      }

      console.log(`Notification sent to ${admins.length} admins: ${title}`);
    } catch (error) {
      console.error("Error sending notification to admins:", error);
    }
  }

  // Get all admin users
  getAllAdmins() {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT id FROM users WHERE role = 'admin'",
        (err, results) => {
          if (err) {
            console.error("Error fetching admins:", err);
            reject(err);
          } else {
            resolve(results);
          }
        }
      );
    });
  }

  // Trigger notification for new booking
  async notifyNewBooking(bookingData) {
    try {
      const { userId, bookingId, serviceName, packageName, bookingDate, bookingTime } = bookingData;

      const itemName = serviceName || packageName;
      const title = "New Booking Received";
      const message = `New booking for ${itemName} on ${bookingDate} at ${bookingTime}`;

      await this.sendNotificationToAdmins(title, message, "admin_alert", bookingId);
    } catch (error) {
      console.error("Error sending new booking notification:", error);
    }
  }

  // Trigger notification for booking cancellation
  async notifyBookingCancellation(bookingData) {
    try {
      const { userId, bookingId, serviceName, packageName, bookingDate, bookingTime } = bookingData;

      const itemName = serviceName || packageName;
      const title = "Booking Cancelled - Available for Reschedule";
      const message = `${itemName} booking cancelled for ${bookingDate} at ${bookingTime}. Available for reschedule.`;

      await this.sendNotificationToAdmins(title, message, "cancellation", bookingId);
    } catch (error) {
      console.error("Error sending cancellation notification:", error);
    }
  }

  async notifyBookingConfirmed(bookingData) {
    try {
      const { userId, bookingId, itemName, bookingDate, bookingTime } = bookingData;
      const alreadySent = await NotificationManager.notificationExists(
        userId,
        "booking_confirmed",
        bookingId
      );
      if (alreadySent) return false;

      const title = "Booking Confirmed";
      const message = `${itemName || "Your booking"} is confirmed for ${bookingDate} at ${bookingTime}.`;

      await this.sendNotificationToUser(userId, title, message, "booking_confirmed", bookingId);
      return true;
    } catch (error) {
      console.error("Error sending booking confirmed notification:", error);
      return false;
    }
  }

  async notifyUserBookingReceived(bookingData) {
    try {
      const { userId, bookingId, itemName, bookingDate, bookingTime } = bookingData;
      const alreadySent = await NotificationManager.notificationExists(
        userId,
        "booking_received",
        bookingId
      );
      if (alreadySent) return;

      const title = "Booking Received";
      const message = `${itemName || "Your booking"} has been received for ${bookingDate} at ${bookingTime}.`;

      await this.sendNotificationToUser(userId, title, message, "booking_received", bookingId);
    } catch (error) {
      console.error("Error sending booking received notification:", error);
    }
  }

  // Trigger reminder notification for upcoming service
  async notifyUpcomingService(bookingData) {
    try {
      const { userId, bookingId, serviceName, packageName, bookingDate, bookingTime } = bookingData;

      const reminderAlreadySent = await NotificationManager.notificationExists(
        userId,
        "reminder",
        bookingId
      );
      if (reminderAlreadySent) {
        return false;
      }

      const itemName = serviceName || packageName;
      const title = "Upcoming Service Reminder";
      const message = `Your ${itemName} service is scheduled for tomorrow at ${bookingTime}`;

      await this.sendNotificationToUser(userId, title, message, "reminder", bookingId);
      return true;
    } catch (error) {
      console.error("Error sending reminder notification:", error);
      return false;
    }
  }

  async notifyBookingCompleted(bookingData) {
    try {
      const { userId, bookingId } = bookingData;
      const title = "Service Completed";
      const message = "Your booking has been completed. You can now share private feedback or leave a review.";

      await this.sendNotificationToUser(userId, title, message, "booking_completed", bookingId);
    } catch (error) {
      console.error("Error sending completed booking notification:", error);
    }
  }

  async notifyBookingMissed(bookingData) {
    try {
      const { userId, bookingId } = bookingData;
      const title = "Booking Marked Missed";
      const message = "Your booking was marked as missed. You can book the service again for another time.";

      await this.sendNotificationToUser(userId, title, message, "booking_missed", bookingId);
    } catch (error) {
      console.error("Error sending missed booking notification:", error);
    }
  }

  // Start scheduler to check for upcoming services
  startReminderScheduler() {
    // Check every hour for services happening tomorrow
    setInterval(async () => {
      try {
        await this.checkUpcomingServices();
      } catch (error) {
        console.error("Error in reminder scheduler:", error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Also check immediately on startup
    setTimeout(() => {
      this.checkUpcomingServices();
    }, 5000);
  }

  // Check for services happening tomorrow and send reminders
  async checkUpcomingServices() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Get all upcoming bookings for tomorrow
      const bookings = await this.getUpcomingBookingsForDate(tomorrowStr);

      let sentCount = 0;
      for (const booking of bookings) {
        const sent = await this.notifyUpcomingService({
          userId: booking.user_id,
          bookingId: booking.id,
          serviceName: booking.service_name,
          packageName: booking.package_name,
          bookingDate: booking.booking_date,
          bookingTime: booking.booking_time
        });
        if (sent) sentCount += 1;
      }

      if (sentCount > 0) {
        console.log(`Sent ${sentCount} reminder notifications for tomorrow`);
      }
    } catch (error) {
      console.error("Error checking upcoming services:", error);
    }
  }

  // Get upcoming bookings for a specific date
  getUpcomingBookingsForDate(date) {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT
          b.id,
          b.user_id,
          b.booking_date,
          b.booking_time,
          COALESCE(s.name, b.custom_service_names) AS service_name,
          p.name AS package_name
        FROM bookings b
        LEFT JOIN services s ON b.service_id = s.id
        LEFT JOIN packages p ON b.package_id = p.id
        WHERE b.booking_date = ? AND b.status = 'upcoming'`,
        [date],
        (err, results) => {
          if (err) {
            console.error("Error fetching upcoming bookings:", err);
            reject(err);
          } else {
            resolve(results);
          }
        }
      );
    });
  }
}

module.exports = NotificationService;
