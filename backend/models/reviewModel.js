const db = require("../db");

const findPublicReviews = async () => {
  const [rows] = await db.promise().query(
    `SELECT
       f.booking_id AS bookingId,
       u.fullname AS customer,
       f.rating,
       f.feedback_text AS review,
       f.created_at,
       COALESCE(s.name, p.name, 'Singar Glow service') AS itemName,
       CASE
         WHEN s.id IS NOT NULL THEN 'Service'
         WHEN p.id IS NOT NULL THEN 'Package'
         ELSE 'Booking'
       END AS itemType
     FROM feedback f
     JOIN users u ON f.user_id = u.id
     JOIN bookings b ON f.booking_id = b.id
     LEFT JOIN services s ON b.service_id = s.id
     LEFT JOIN packages p ON b.package_id = p.id
     ORDER BY f.created_at DESC`
  );

  return rows;
};

const findAdminReviews = async () => {
  const [rows] = await db.promise().query(
    `SELECT f.booking_id AS bookingId, u.fullname AS customer, f.rating, f.feedback_text AS review, f.created_at
     FROM feedback f
     JOIN users u ON f.user_id = u.id
     ORDER BY f.created_at DESC`
  );

  return rows;
};

module.exports = {
  findAdminReviews,
  findPublicReviews,
};
