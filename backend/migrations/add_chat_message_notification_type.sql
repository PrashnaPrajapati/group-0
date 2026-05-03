ALTER TABLE notifications
  MODIFY type ENUM('booking', 'cancellation', 'reminder', 'admin_alert', 'chat_message') NOT NULL;
