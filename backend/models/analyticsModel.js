const db = require("../db");

const getStats = async () => {
  const [users] = await db.promise().query("SELECT COUNT(id) AS totalUsers FROM users");
  const [userRoles] = await db.promise().query(
    `SELECT
       SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS totalAdmins,
       SUM(CASE WHEN role = 'users' OR role IS NULL THEN 1 ELSE 0 END) AS totalCustomers
     FROM users`
  );
  const [bookings] = await db.promise().query("SELECT COUNT(id) AS totalBookings FROM bookings");
  const [services] = await db.promise().query("SELECT COUNT(id) AS totalServices FROM services");
  const [packages] = await db.promise().query("SELECT COUNT(id) AS totalPackages FROM packages");

  return {
    totalUsers: users[0]?.totalUsers || 0,
    totalAdmins: userRoles[0]?.totalAdmins || 0,
    totalCustomers: userRoles[0]?.totalCustomers || 0,
    totalBookings: bookings[0]?.totalBookings || 0,
    totalServices: services[0]?.totalServices || 0,
    totalPackages: packages[0]?.totalPackages || 0,
  };
};

const getMonthlyStats = async () => {
  const [rows] = await db.promise().query(
    `SELECT
      DATE_FORMAT(b.booking_date, '%Y-%m') AS month,
      COUNT(b.id) AS bookings,
      COALESCE(SUM(IFNULL(s.price, 0) + IFNULL(p.price, 0) + IFNULL(b.custom_service_price, 0)), 0) AS revenue
    FROM bookings b
    LEFT JOIN services s ON b.service_id = s.id
    LEFT JOIN packages p ON b.package_id = p.id
    GROUP BY DATE_FORMAT(b.booking_date, '%Y-%m')
    ORDER BY DATE_FORMAT(b.booking_date, '%Y-%m')`
  );

  return rows || [];
};

const getServiceCategories = async () => {
  const [rows] = await db.promise().query(
    `SELECT category AS name, COUNT(id) AS value
     FROM services
     GROUP BY category`
  );

  return rows || [];
};

module.exports = {
  getMonthlyStats,
  getServiceCategories,
  getStats,
};
