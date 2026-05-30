const vader = require("vader-sentiment");
const analyzeSentimentText = require("../sentimentAnalysis");
const Sentiment = require("../models/sentimentModel");

const getAiSentiment = async (req, res) => {
  try {
    const reviewRows = await Sentiment.findReviewTexts();
    const counts = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    reviewRows.forEach((row) => {
      const reviewText = String(row.feedback_text || "").trim();
      if (!reviewText) return;

      try {
        const sentiment = vader.SentimentIntensityAnalyzer.polarity_scores(reviewText);
        const compound = sentiment.compound;

        if (compound >= 0.05) counts.positive += 1;
        else if (compound <= -0.05) counts.negative += 1;
        else counts.neutral += 1;
      } catch (error) {
        console.error("Error analyzing sentiment for text:", reviewText, error);
        counts.neutral += 1;
      }
    });

    res.json([
      { sentiment: "positive", count: counts.positive },
      { sentiment: "neutral", count: counts.neutral },
      { sentiment: "negative", count: counts.negative },
    ]);
  } catch (err) {
    console.error("AI sentiment error:", err);
    res.status(500).json({ message: "Error fetching sentiment data", error: err.message });
  }
};

const getAiSentimentDetails = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    const total = await Sentiment.countSentimentDetails({ search });
    const reviewRows = await Sentiment.findSentimentDetails({ search, limit, offset });

    const details = reviewRows.map((entry) => {
      const text = (entry.review || "").trim();
      let compound = 0;
      let label = "neutral";

      try {
        const sentimentScores = vader.SentimentIntensityAnalyzer.polarity_scores(text);
        compound = sentimentScores.compound;
        if (compound >= 0.05) label = "positive";
        else if (compound <= -0.05) label = "negative";
      } catch (error) {
        console.error("Sentiment analysis error for text:", text, error);
      }

      return {
        id: entry.id,
        customer: entry.customer || "Unknown",
        review: text,
        rating: entry.rating,
        createdAt: entry.created_at,
        sentiment: label,
        sentimentScore: compound,
      };
    });

    res.json({
      data: details,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error("AI sentiment details error:", err);
    res.status(500).json({ message: "Error fetching sentiment details", error: err.message });
  }
};

const analyzeSentiment = (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: "Text is required" });
  }

  const result = analyzeSentimentText(text);
  res.json(result);
};

module.exports = {
  analyzeSentiment,
  getAiSentiment,
  getAiSentimentDetails,
};
