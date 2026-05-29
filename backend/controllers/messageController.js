const Message = require("../models/messageModel");

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Message.getUnreadCount(req.user.id);
    res.json({ unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getAdminUnreadPerUser = async (req, res) => {
  try {
    const results = await Message.getAdminUnreadCounts(req.user.id);
    const counts = {};
    results.forEach((row) => {
      counts[row.userId] = row.unreadCount;
    });
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAdminUnreadPerUser,
  getUnreadCount,
};
