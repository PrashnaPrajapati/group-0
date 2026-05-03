const express = require("express");
const router = express.Router();
const db = require("./db");
const jwt = require("jsonwebtoken");

const verifyUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, process.env.SECRET_KEY);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
 
router.post("/save-transaction", async (req, res) => {
  try {
    const { refId, txnId, amount, bookingIds, status, paymentMethod } =
      req.body;

    if (!refId || !txnId || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const query = `
      INSERT INTO payments 
      (reference_id, transaction_id, amount, booking_ids, status, payment_method, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    db.query(
      query,
      [
        refId,
        txnId,
        amount,
        bookingIds ? bookingIds.join(",") : "",
        status || "completed",
        paymentMethod || "esewa",
      ],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.json({
              success: true,
              duplicate: true,
              message: "Transaction already saved",
            });
          }
          console.error(err);
          return res.status(500).json({ error: "Database error" });
        }
        res.json({
          success: true,
          paymentId: result.insertId,
          message: "Transaction saved successfully",
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
 
router.get("/transaction/:refId", (req, res) => {
  try {
    const { refId } = req.params;

    const query = `SELECT * FROM payments WHERE reference_id = ?`;

    db.query(query, [refId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Payment not found" });
      }

      res.json(results[0]);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/history", verifyUser, (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT
      p.id,
      p.reference_id,
      p.transaction_id,
      p.amount,
      p.booking_ids,
      p.status,
      p.payment_method,
      p.created_at,
      GROUP_CONCAT(DISTINCT COALESCE(pk.name, s.name) ORDER BY b.id SEPARATOR ', ') AS items
    FROM payments p
    JOIN JSON_TABLE(
      CONCAT('[', COALESCE(NULLIF(p.booking_ids, ''), 'null'), ']'),
      '$[*]' COLUMNS (booking_id INT PATH '$' NULL ON EMPTY NULL ON ERROR)
    ) payment_booking
    JOIN bookings b ON b.id = payment_booking.booking_id
    LEFT JOIN services s ON b.service_id = s.id
    LEFT JOIN packages pk ON b.package_id = pk.id
    WHERE b.user_id = ?
    GROUP BY
      p.id,
      p.reference_id,
      p.transaction_id,
      p.amount,
      p.booking_ids,
      p.status,
      p.payment_method,
      p.created_at
    ORDER BY p.created_at DESC
  `;

  db.query(query, [userId], (err, rows) => {
    if (err) {
      console.error("Payment history error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const payments = rows.map((payment) => ({
      ...payment,
      amount: Number(payment.amount) || 0,
    }));

    const paidStatuses = new Set(["completed", "success", "paid"]);
    const totalSpent = payments.reduce((sum, payment) => {
      const status = String(payment.status || "").toLowerCase();
      return paidStatuses.has(status) ? sum + payment.amount : sum;
    }, 0);

    res.json({
      totalSpent,
      count: payments.length,
      payments,
    });
  });
});

module.exports = router;
