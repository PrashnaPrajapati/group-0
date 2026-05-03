ALTER TABLE bookings
  ADD COLUMN custom_service_ids TEXT NULL,
  ADD COLUMN custom_service_names TEXT NULL,
  ADD COLUMN custom_service_price DECIMAL(10,2) NULL,
  ADD COLUMN custom_service_duration INT NULL;
