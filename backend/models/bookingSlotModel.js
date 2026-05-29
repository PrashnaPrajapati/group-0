const db = require("../db");

const findBookedSlotsByDate = async (date) => {
  const [rows] = await db.promise().query(
    `SELECT b.booking_time, COALESCE(s.duration, p.duration, b.custom_service_duration) AS duration
     FROM bookings b
     LEFT JOIN services s ON b.service_id = s.id
     LEFT JOIN packages p ON b.package_id = p.id
     WHERE b.booking_date = ? AND b.status <> 'cancelled'`,
    [date]
  );

  return rows;
};

module.exports = {
  findBookedSlotsByDate,
};
