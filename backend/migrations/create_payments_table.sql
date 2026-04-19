-- Add constraints and indexes to existing payments table
ALTER TABLE payments
ADD CONSTRAINT uk_transaction_id UNIQUE (transaction_id),
ADD INDEX idx_reference_id (reference_id),
ADD INDEX idx_transaction_id (transaction_id);

-- Update default values if needed
ALTER TABLE payments
MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending',
MODIFY COLUMN payment_method VARCHAR(50) DEFAULT 'esewa';