const Payment = require("../models/paymentModel");

const paidStatuses = new Set(["completed", "success", "paid"]);

const normalizePayments = (payments) =>
  payments.map((payment) => ({
    ...payment,
    amount: Number(payment.amount) || 0,
    bookingCount: Number(payment.booking_count) || 0,
    cancelledBookingCount: Number(payment.cancelled_booking_count) || 0,
    cancelledAmount: Number(payment.cancelled_amount) || 0,
    cancellationCharge: Number(payment.cancellation_charge) || 0,
    refundAmount: Number(payment.refund_amount) || 0,
  }));

const getNetSpentAmount = (payment) => {
  const status = String(payment.status || "").toLowerCase();
  if (!paidStatuses.has(status)) return 0;

  if (payment.cancelledBookingCount > 0) {
    return payment.cancellationCharge;
  }

  return payment.amount;
};

const createLegacyPayment = async (req, res) => {
  try {
    const { bookingId, amount, method, status } = req.body;

    await Payment.createLegacyPayment({ bookingId, amount, method, status });

    if (status === "success") {
      await Payment.markBookingConfirmed(bookingId);
      return res.json({ success: true });
    }

    return res.json({ success: false });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "DB insert failed" });
  }
};

const saveTransaction = async (req, res) => {
  try {
    const { refId, txnId, amount, bookingIds, status, paymentMethod } = req.body;

    if (!refId || !txnId || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const paymentId = await Payment.saveTransaction({
      refId,
      txnId,
      amount,
      bookingIds,
      status,
      paymentMethod,
    });

    res.json({
      success: true,
      paymentId,
      message: "Transaction saved successfully",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.json({
        success: true,
        duplicate: true,
        message: "Transaction already saved",
      });
    }

    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};

const getTransaction = async (req, res) => {
  try {
    const payment = await Payment.findByReferenceId(req.params.refId);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const payments = normalizePayments(await Payment.findHistoryByUserId(req.user.id));
    const totalSpent = payments.reduce((sum, payment) => sum + getNetSpentAmount(payment), 0);

    res.json({
      totalSpent,
      count: payments.length,
      payments,
    });
  } catch (err) {
    console.error("Payment history error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

const getAdminPayments = async (req, res) => {
  try {
    const payments = normalizePayments(await Payment.findAdminPayments());
    const summary = payments.reduce(
      (totals, payment) => {
        const status = String(payment.status || "").toLowerCase();
        const isPaid = paidStatuses.has(status);

        return {
          totalRevenue: isPaid ? totals.totalRevenue + payment.amount : totals.totalRevenue,
          completedCount: isPaid ? totals.completedCount + 1 : totals.completedCount,
          pendingCount: status === "pending" ? totals.pendingCount + 1 : totals.pendingCount,
          failedCount:
            status === "failed" || status === "cancelled"
              ? totals.failedCount + 1
              : totals.failedCount,
          transactionCount: totals.transactionCount + 1,
        };
      },
      {
        totalRevenue: 0,
        completedCount: 0,
        pendingCount: 0,
        failedCount: 0,
        transactionCount: 0,
      }
    );

    res.json({ summary, payments });
  } catch (err) {
    console.error("Admin payments error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

const updateAdminPaymentStatus = async (req, res) => {
  try {
    const paymentId = Number(req.params.id);
    const status = String(req.body.status || "").toLowerCase();
    const allowedStatuses = new Set(["pending", "completed", "failed", "cancelled"]);

    if (!paymentId) {
      return res.status(400).json({ message: "Invalid payment ID" });
    }

    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const affectedRows = await Payment.updateStatus(paymentId, status);
    if (affectedRows === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json({ message: "Payment status updated", status });
  } catch (err) {
    console.error("Admin payment status update error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

module.exports = {
  createLegacyPayment,
  getAdminPayments,
  getPaymentHistory,
  getTransaction,
  saveTransaction,
  updateAdminPaymentStatus,
};
