const mysql = require("mysql2");
require("dotenv").config();

// Database connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Root@1234",
  database: "group0",
});

connection.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
  console.log("✓ Connected to database");

  // Messages table
  const messagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      sender_role ENUM('users', 'admin') NOT NULL,
      message_text TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_conversation (sender_id, receiver_id),
      INDEX idx_created_at (created_at),
      INDEX idx_is_read (is_read)
    );
  `;

  // Conversations table
  const conversationsTable = `
    CREATE TABLE IF NOT EXISTS conversations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      admin_id INT NOT NULL,
      last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_conversation (user_id, admin_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_admin_id (admin_id)
    );
  `;

  // Run migrations
  connection.query(messagesTable, (err) => {
    if (err) {
      console.error("Error creating messages table:", err);
      connection.end();
      process.exit(1);
    }
    console.log("✓ Messages table created/verified");

    connection.query(conversationsTable, (err) => {
      if (err) {
        console.error("Error creating conversations table:", err);
        connection.end();
        process.exit(1);
      }
      console.log("✓ Conversations table created/verified");
      
      console.log("\n✅ All database migrations completed successfully!");
      connection.end();
      process.exit(0);
    });
  });
});
