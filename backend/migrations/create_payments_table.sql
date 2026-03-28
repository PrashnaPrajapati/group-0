-- Run this SQL in your MySQL database (group0)

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_id VARCHAR(100) NOT NULL UNIQUE,
  transaction_id VARCHAR(100) NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  booking_ids TEXT,
  status VARCHAR(50) DEFAULT 'completed',
  payment_method VARCHAR(50) DEFAULT 'esewa',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (reference_id),
  INDEX (transaction_id),
  INDEX (created_at)
);
