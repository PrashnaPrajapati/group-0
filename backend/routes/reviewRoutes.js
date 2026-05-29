const express = require("express");
const { getAdminReviews, getReviews } = require("../controllers/reviewController");
const { verifyAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/reviews", getReviews);
router.get("/review", verifyAdmin, getAdminReviews);

module.exports = router;
