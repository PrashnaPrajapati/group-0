const express = require("express");
const {
  createLegacyPayment,
  getAdminPayments,
  getPaymentHistory,
  getTransaction,
  saveTransaction,
  updateAdminPaymentStatus,
} = require("../controllers/paymentController");
const { verifyAdmin, verifyUser } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/payment", createLegacyPayment);
router.post("/payments/save-transaction", saveTransaction);
router.get("/payments/transaction/:refId", getTransaction);
router.get("/payments/history", verifyUser, getPaymentHistory);
router.get("/admin/payments", verifyAdmin, getAdminPayments);
router.patch("/admin/payments/:id/status", verifyAdmin, updateAdminPaymentStatus);

module.exports = router;
