const db = require("../db");

const ensurePrivateFeedbackTable = async () => {
  await db.promise().query(
    `CREATE TABLE IF NOT EXISTS private_feedback (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      user_id INT NOT NULL,
      feedback_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_private_feedback (booking_id, user_id)
    )`
  );
};

const markMissedBookings = async () => {
  const [result] = await db.promise().query(
    `UPDATE bookings
     SET status = 'missed'
     WHERE status = 'upcoming'
       AND TIMESTAMP(booking_date, booking_time) < NOW()`
  );

  return result.affectedRows;
};

const findDuplicatePackageBooking = async (userId, packageId) => {
  const [rows] = await db.promise().query(
    "SELECT id FROM bookings WHERE user_id = ? AND package_id = ? AND status NOT IN ('cancelled', 'pending', 'missed')",
    [userId, packageId]
  );

  return rows[0] || null;
};

const createPackageBooking = async ({
  userId,
  packageId,
  bookingDate,
  bookingTime,
  notes,
  status,
  locationType,
  address,
}) => {
  const [result] = await db.promise().query(
    `INSERT INTO bookings
     (user_id, package_id, booking_date, booking_time, notes, status, location_type, address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, packageId, bookingDate, bookingTime, notes || null, status, locationType, address || null]
  );

  return result.insertId;
};

const findPackageName = async (packageId) => {
  const [rows] = await db.promise().query("SELECT name FROM packages WHERE id = ?", [packageId]);
  return rows[0] || null;
};

const findActiveServicesByIds = async (serviceIds) => {
  const [rows] = await db.promise().query(
    `SELECT id, name, price, duration
     FROM services
     WHERE id IN (?) AND status = 'active'`,
    [serviceIds]
  );

  return rows;
};

const createCustomServiceBooking = async ({
  userId,
  bookingDate,
  bookingTime,
  notes,
  status,
  locationType,
  address,
  serviceIds,
  serviceNames,
  servicePrice,
  serviceDuration,
}) => {
  const [result] = await db.promise().query(
    `INSERT INTO bookings
     (user_id, booking_date, booking_time, notes, status, location_type, address,
      custom_service_ids, custom_service_names, custom_service_price, custom_service_duration)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      bookingDate,
      bookingTime,
      notes || null,
      status,
      locationType,
      address || null,
      JSON.stringify(serviceIds),
      serviceNames,
      servicePrice,
      serviceDuration,
    ]
  );

  return result.insertId;
};

const findDuplicateServiceBookings = async (userId, serviceIds) => {
  if (!serviceIds.length) return [];

  const [rows] = await db.promise().query(
    "SELECT service_id FROM bookings WHERE user_id = ? AND service_id IN (?) AND status NOT IN ('cancelled', 'pending', 'missed')",
    [userId, serviceIds]
  );

  return rows.map((row) => row.service_id);
};

const createServiceBooking = async ({
  userId,
  serviceId,
  bookingDate,
  bookingTime,
  notes,
  status,
  locationType,
  address,
}) => {
  const [result] = await db.promise().query(
    `INSERT INTO bookings
     (user_id, service_id, booking_date, booking_time, notes, status, location_type, address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, serviceId, bookingDate, bookingTime, notes || null, status, locationType, address || null]
  );

  return result.insertId;
};

const findServiceName = async (serviceId) => {
  const [rows] = await db.promise().query("SELECT name FROM services WHERE id = ?", [serviceId]);
  return rows[0] || null;
};

const findUserBookings = async (userId) => {
  await ensurePrivateFeedbackTable();

  const [rows] = await db.promise().query(
    `SELECT
      b.id,
      b.booking_date,
      b.booking_time,
      b.notes,
      b.status,
      b.feedback_submitted,
      b.address,
      b.location_type,
      b.service_id,
      b.package_id,
      b.custom_service_ids,
      b.custom_service_names,
      b.custom_service_price,
      b.custom_service_duration,
      EXISTS (
        SELECT 1
        FROM private_feedback pf
        WHERE pf.booking_id = b.id AND pf.user_id = b.user_id
      ) AS private_feedback_submitted,
      s.name AS service_name,
      s.price AS service_price,
      p.name AS package_name,
      p.price AS package_price
    FROM bookings b
    LEFT JOIN services s ON b.service_id = s.id
    LEFT JOIN packages p ON b.package_id = p.id
    WHERE b.user_id = ?
    ORDER BY b.id DESC`,
    [userId]
  );

  return rows;
};

const findAdminBookings = async () => {
  const [rows] = await db.promise().query(
    `SELECT b.id,
            u.fullName AS user,
            s.name AS service,
            p.name AS package,
            b.custom_service_names,
            b.custom_service_price,
            b.custom_service_duration,
            b.booking_date,
            b.booking_time,
            b.notes,
            b.status,
            s.price AS service_price,
            p.price AS package_price
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     LEFT JOIN services s ON b.service_id = s.id
     LEFT JOIN packages p ON b.package_id = p.id
     ORDER BY b.id DESC`
  );

  return rows;
};

const findBookingForCancellation = async (bookingId, userId) => {
  const [rows] = await db.promise().query(
    `SELECT b.*, s.name AS service_name, p.name AS package_name,
            COALESCE(s.price, p.price, b.custom_service_price, 0) AS booking_amount
     FROM bookings b
     LEFT JOIN services s ON b.service_id = s.id
     LEFT JOIN packages p ON b.package_id = p.id
     WHERE b.id = ? AND b.user_id = ?`,
    [bookingId, userId]
  );

  return rows[0] || null;
};

const cancelUserBooking = async (bookingId, userId) => {
  const [result] = await db.promise().query(
    "UPDATE bookings SET status='cancelled' WHERE id=? AND user_id=?",
    [bookingId, userId]
  );

  return result.affectedRows;
};

const cancelFailedPaymentBookings = async (bookingIds, userId) => {
  const [result] = await db.promise().query(
    "UPDATE bookings SET status='cancelled' WHERE id IN (?) AND user_id=? AND status IN ('pending', 'upcoming')",
    [bookingIds, userId]
  );

  return result.affectedRows;
};

const findBookingById = async (bookingId) => {
  const [rows] = await db.promise().query("SELECT * FROM bookings WHERE id = ?", [bookingId]);
  return rows[0] || null;
};

const updateRescheduledBooking = async ({
  bookingId,
  bookingDate,
  bookingTime,
  locationType,
  address,
  reason,
}) => {
  const [result] = await db.promise().query(
    `UPDATE bookings
     SET booking_date=?, booking_time=?, location_type=?, address=?, notes=COALESCE(?, notes)
     WHERE id=?`,
    [bookingDate, bookingTime, locationType, address, reason, bookingId]
  );

  return result.affectedRows;
};

const findBookingStatus = async (bookingId) => {
  const [rows] = await db.promise().query(
    "SELECT id, user_id, booking_date, booking_time, status FROM bookings WHERE id = ?",
    [bookingId]
  );
  return rows[0] || null;
};

const findBookingConfirmationDetails = async (bookingId) => {
  const [rows] = await db.promise().query(
    `SELECT
      b.id,
      b.user_id,
      b.booking_date,
      b.booking_time,
      COALESCE(s.name, p.name, b.custom_service_names, CONCAT('Booking ', b.id)) AS item_name,
      u.fullName,
      u.email
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     LEFT JOIN services s ON b.service_id = s.id
     LEFT JOIN packages p ON b.package_id = p.id
     WHERE b.id = ?`,
    [bookingId]
  );

  return rows[0] || null;
};

const updateBookingStatus = async (bookingId, status) => {
  const [result] = await db.promise().query(
    "UPDATE bookings SET status = ? WHERE id = ?",
    [status, bookingId]
  );

  return result.affectedRows;
};

const findBookingsForUser = async (bookingIds, userId) => {
  const [rows] = await db.promise().query(
    `SELECT
      b.id,
      b.status,
      b.user_id,
      b.booking_date,
      b.booking_time,
      COALESCE(s.name, p.name, b.custom_service_names, CONCAT('Booking ', b.id)) AS item_name,
      u.fullName,
      u.email
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     LEFT JOIN services s ON b.service_id = s.id
     LEFT JOIN packages p ON b.package_id = p.id
     WHERE b.id IN (?) AND b.user_id = ?`,
    [bookingIds, userId]
  );

  return rows;
};

const confirmBookings = async (bookingIds, userId) => {
  const [result] = await db.promise().query(
    `UPDATE bookings
     SET status = 'upcoming'
     WHERE id IN (?) AND user_id = ? AND status IN ('pending', 'upcoming')`,
    [bookingIds, userId]
  );

  return result.affectedRows;
};

const findPackageServiceIds = async (packageId) => {
  const [rows] = await db.promise().query(
    "SELECT service_id FROM package_services WHERE package_id=?",
    [packageId]
  );

  return rows.map((row) => row.service_id);
};

const createPackageServiceBookings = async ({
  userId,
  serviceIds,
  bookingDate,
  bookingTime,
  notes,
  locationType,
  address,
}) => {
  const values = serviceIds.map((serviceId) => [
    userId,
    serviceId,
    bookingDate,
    bookingTime,
    notes || null,
    "upcoming",
    locationType,
    address || null,
  ]);

  await db.promise().query(
    `INSERT INTO bookings
     (user_id, service_id, booking_date, booking_time, notes, status, location_type, address)
     VALUES ?`,
    [values]
  );
};

const findFeedbackByBookingAndUser = async (bookingId, userId) => {
  const [rows] = await db.promise().query(
    "SELECT * FROM feedback WHERE booking_id = ? AND user_id = ?",
    [bookingId, userId]
  );

  return rows[0] || null;
};

const findPrivateFeedbackByBookingAndUser = async (bookingId, userId) => {
  await ensurePrivateFeedbackTable();
  const [rows] = await db.promise().query(
    "SELECT * FROM private_feedback WHERE booking_id = ? AND user_id = ?",
    [bookingId, userId]
  );

  return rows[0] || null;
};

const createPrivateFeedback = async ({ bookingId, userId, feedback }) => {
  await ensurePrivateFeedbackTable();
  await db.promise().query(
    "INSERT INTO private_feedback (booking_id, user_id, feedback_text, created_at) VALUES (?, ?, ?, NOW())",
    [bookingId, userId, feedback]
  );
};

const createFeedback = async ({ bookingId, userId, rating, review }) => {
  await db.promise().query(
    "INSERT INTO feedback (booking_id, user_id, rating, feedback_text, created_at) VALUES (?, ?, ?, ?, NOW())",
    [bookingId, userId, rating, review]
  );
};

const markFeedbackSubmitted = async (bookingId) => {
  await db.promise().query(
    "UPDATE bookings SET feedback_submitted = TRUE WHERE id = ?",
    [bookingId]
  );
};

const findReviewsByBookingId = async (bookingId) => {
  const [rows] = await db.promise().query(
    `SELECT u.fullname AS customer, f.rating, f.feedback_text, f.created_at
     FROM feedback f
     JOIN users u ON f.user_id = u.id
     WHERE f.booking_id = ?`,
    [bookingId]
  );

  return rows;
};

const findAdminPrivateFeedback = async () => {
  await ensurePrivateFeedbackTable();

  const [rows] = await db.promise().query(
    `SELECT
       pf.id,
       pf.booking_id AS bookingId,
       pf.feedback_text AS feedback,
       pf.created_at AS submittedAt,
       u.fullName AS customer,
       u.email,
       b.booking_date,
       b.booking_time,
       b.status,
       COALESCE(s.name, p.name, b.custom_service_names, CONCAT('Booking ', b.id)) AS itemName,
       CASE
         WHEN s.id IS NOT NULL THEN 'Service'
         WHEN p.id IS NOT NULL THEN 'Package'
         WHEN b.custom_service_names IS NOT NULL THEN 'Custom Services'
         ELSE 'Booking'
       END AS itemType
     FROM private_feedback pf
     JOIN bookings b ON pf.booking_id = b.id
     JOIN users u ON pf.user_id = u.id
     LEFT JOIN services s ON b.service_id = s.id
     LEFT JOIN packages p ON b.package_id = p.id
     ORDER BY pf.created_at DESC, pf.id DESC`
  );

  return rows;
};

module.exports = {
  cancelFailedPaymentBookings,
  cancelUserBooking,
  confirmBookings,
  createCustomServiceBooking,
  createFeedback,
  createPrivateFeedback,
  createPackageBooking,
  createPackageServiceBookings,
  createServiceBooking,
  findActiveServicesByIds,
  findAdminBookings,
  findAdminPrivateFeedback,
  findBookingById,
  findBookingConfirmationDetails,
  findBookingForCancellation,
  findBookingsForUser,
  findBookingStatus,
  findDuplicatePackageBooking,
  findDuplicateServiceBookings,
  findFeedbackByBookingAndUser,
  findPrivateFeedbackByBookingAndUser,
  findPackageName,
  findPackageServiceIds,
  findReviewsByBookingId,
  findServiceName,
  findUserBookings,
  ensurePrivateFeedbackTable,
  markMissedBookings,
  markFeedbackSubmitted,
  updateBookingStatus,
  updateRescheduledBooking,
};
