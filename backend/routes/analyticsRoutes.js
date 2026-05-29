const express = require("express");
const {
  getMonthlyStats,
  getServiceCategories,
  getStats,
} = require("../controllers/analyticsController");
const { verifyAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/admin/stats", verifyAdmin, getStats);
router.get("/admin/monthly-stats", verifyAdmin, getMonthlyStats);
router.get("/admin/service-categories", verifyAdmin, getServiceCategories);

module.exports = router;
