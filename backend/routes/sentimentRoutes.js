const express = require("express");
const {
  analyzeSentiment,
  getAiSentiment,
  getAiSentimentDetails,
} = require("../controllers/sentimentController");
const { verifyAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/admin/ai-sentiment", verifyAdmin, getAiSentiment);
router.get("/admin/ai-sentiment-details", verifyAdmin, getAiSentimentDetails);
router.post("/api/sentiment", analyzeSentiment);

module.exports = router;
