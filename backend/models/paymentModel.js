const db = require("../db");

const createLegacyPayment = async ({ bookingId, amount, method, status }) => {
  const [result] = await db.promise().query(
    `INSERT INTO payments (booking_id, amount, method, status)
     VALUES (?, ?, ?, ?)`,
    [bookingId, amount, method, status]
  );

  return result.insertId;
};

const markBookingConfirmed = async (bookingId) => {
  const [result] = await db.promise().query(
    "UPDATE bookings SET status='confirmed' WHERE id=?",
    [bookingId]
  );

  return result.affectedRows;
};

const saveTransaction = async ({ refId, txnId, amount, bookingIds, status, paymentMethod }) => {
  const [result] = await db.promise().query(
    `INSERT INTO payments
     (reference_id, transaction_id, amount, booking_ids, status, payment_method, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      refId,
      txnId,
      amount,
      bookingIds ? bookingIds.join(",") : "",
      status || "completed",
      paymentMethod || "esewa",
    ]
  );

  return result.insertId;
};

const findByReferenceId = async (refId) => {
  const [rows] = await db.promise().query(
    "SELECT * FROM payments WHERE reference_id = ?",
    [refId]
  );

  return rows[0] || null;
};

const findHistoryByUserId = async (userId) => {
  const [paymentRows] = await db.promise().query(
    `SELECT
      p.id,
      p.reference_id,
      p.transaction_id,
      p.amount,
      p.booking_ids,
      p.status,
      p.payment_method,
      p.created_at,
      COUNT(DISTINCT b.id) AS booking_count,
      SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_booking_count,
      GROUP_CONCAT(DISTINCT b.status ORDER BY b.id SEPARATOR ', ') AS booking_statuses,
      GROUP_CONCAT(DISTINCT COALESCE(pk.name, s.name, b.custom_service_names, CONCAT('Booking ', b.id)) ORDER BY b.id SEPARATOR ', ') AS items,
      SUM(
        CASE
          WHEN b.status = 'cancelled'
          THEN COALESCE(b.custom_service_price, pk.price, s.price, 0)
          ELSE 0
        END
      ) AS cancelled_amount,
      ROUND(
        SUM(
          CASE
            WHEN b.status = 'cancelled'
            THEN COALESCE(b.custom_service_price, pk.price, s.price, 0)
            ELSE 0
          END
        ) * 0.15,
        2
      ) AS cancellation_charge,
      GREATEST(
        ROUND(
          SUM(
            CASE
              WHEN b.status = 'cancelled'
              THEN COALESCE(b.custom_service_price, pk.price, s.price, 0)
              ELSE 0
            END
          ) * 0.85,
          2
        ),
        0
      ) AS refund_amount
    FROM payments p
    JOIN JSON_TABLE(
      CONCAT('[', COALESCE(NULLIF(p.booking_ids, ''), 'null'), ']'),
      '$[*]' COLUMNS (booking_id INT PATH '$' NULL ON EMPTY NULL ON ERROR)
    ) payment_booking
    JOIN bookings b ON b.id = payment_booking.booking_id
    LEFT JOIN services s ON b.service_id = s.id
    LEFT JOIN packages pk ON b.package_id = pk.id
    WHERE b.user_id = ?
      AND NOT (
        LOWER(COALESCE(p.payment_method, '')) = 'cash'
        AND LOWER(COALESCE(p.status, '')) = 'pending'
      )
    GROUP BY
      p.id,
      p.reference_id,
      p.transaction_id,
      p.amount,
      p.booking_ids,
      p.status,
      p.payment_method,
      p.created_at
    ORDER BY p.created_at DESC`,
    [userId]
  );

  const [completedCashRows] = await db.promise().query(
    `SELECT
      CONCAT('cash-', b.id) AS id,
      CONCAT('CASH-', b.id) AS reference_id,
      CONCAT('CASH-', b.id) AS transaction_id,
      COALESCE(b.custom_service_price, pk.price, s.price, 0) AS amount,
      CAST(b.id AS CHAR) AS booking_ids,
      'completed' AS status,
      'cash' AS payment_method,
      TIMESTAMP(b.booking_date, b.booking_time) AS created_at,
      1 AS booking_count,
      0 AS cancelled_booking_count,
      b.status AS booking_statuses,
      COALESCE(pk.name, s.name, b.custom_service_names, CONCAT('Booking ', b.id)) AS items,
      0 AS cancelled_amount,
      0 AS cancellation_charge,
      0 AS refund_amount
    FROM bookings b
    LEFT JOIN services s ON b.service_id = s.id
    LEFT JOIN packages pk ON b.package_id = pk.id
    WHERE b.user_id = ?
      AND b.status = 'completed'
      AND NOT EXISTS (
        SELECT 1
        FROM payments paid
        WHERE FIND_IN_SET(b.id, REPLACE(COALESCE(paid.booking_ids, ''), ' ', '')) > 0
          AND LOWER(COALESCE(paid.status, '')) IN ('completed', 'success', 'paid')
      )`,
    [userId]
  );

  return [...paymentRows, ...completedCashRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

const findAdminPayments = async () => {
  const [rows] = await db.promise().query(
    `SELECT
      p.id,
      p.reference_id,
      p.transaction_id,
      p.amount,
      p.booking_ids,
      p.status,
      p.payment_method,
      p.created_at,
      u.id AS user_id,
      u.fullName AS customer_name,
      u.email AS customer_email,
      GROUP_CONCAT(DISTINCT b.id ORDER BY b.id SEPARATOR ', ') AS booking_numbers,
      GROUP_CONCAT(DISTINCT COALESCE(pk.name, s.name) ORDER BY b.id SEPARATOR ', ') AS items
    FROM payments p
    JOIN JSON_TABLE(
      CONCAT('[', COALESCE(NULLIF(p.booking_ids, ''), 'null'), ']'),
      '$[*]' COLUMNS (booking_id INT PATH '$' NULL ON EMPTY NULL ON ERROR)
    ) payment_booking
    JOIN bookings b ON b.id = payment_booking.booking_id
    LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN services s ON b.service_id = s.id
    LEFT JOIN packages pk ON b.package_id = pk.id
    GROUP BY
      p.id,
      p.reference_id,
      p.transaction_id,
      p.amount,
      p.booking_ids,
      p.status,
      p.payment_method,
      p.created_at,
      u.id,
      u.fullName,
      u.email
    ORDER BY p.created_at DESC`
  );

  return rows;
};

const updateStatus = async (id, status) => {
  const [result] = await db.promise().query(
    "UPDATE payments SET status = ? WHERE id = ?",
    [status, id]
  );

  return result.affectedRows;
};

module.exports = {
  createLegacyPayment,
  findAdminPayments,
  findByReferenceId,
  findHistoryByUserId,
  markBookingConfirmed,
  saveTransaction,
  updateStatus,
};
