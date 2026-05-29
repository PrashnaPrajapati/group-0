const Review = require("../models/reviewModel");

const getReviews = async (req, res) => {
  try {
    const reviews = await Review.findPublicReviews();
    res.json(reviews);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

const getAdminReviews = async (req, res) => {
  try {
    const reviews = await Review.findAdminReviews();
    res.json(reviews);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

module.exports = {
  getAdminReviews,
  getReviews,
};
