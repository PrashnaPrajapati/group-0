const Analytics = require("../models/analyticsModel");

const getStats = async (req, res) => {
  try {
    const stats = await Analytics.getStats();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching stats" });
  }
};

const getMonthlyStats = async (req, res) => {
  try {
    const monthlyStats = await Analytics.getMonthlyStats();
    res.json(monthlyStats);
  } catch (err) {
    console.error("Error fetching monthly stats:", err);
    res.status(500).json({
      message: "Failed to fetch monthly stats",
      error: err?.message || "unknown",
    });
  }
};

const getServiceCategories = async (req, res) => {
  try {
    const categories = await Analytics.getServiceCategories();
    res.json(categories);
  } catch (err) {
    console.error("Service category error:", err);
    res.status(500).json({ message: "Error fetching service categories" });
  }
};

module.exports = {
  getMonthlyStats,
  getServiceCategories,
  getStats,
};
