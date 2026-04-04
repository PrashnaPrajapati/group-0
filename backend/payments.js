const express = require("express");
const router = express.Router();
const db = require("./db");
 
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

module.exports = router;
