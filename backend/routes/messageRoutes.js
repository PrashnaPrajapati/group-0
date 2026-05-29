const express = require("express");
const { getAdminUnreadPerUser, getUnreadCount } = require("../controllers/messageController");
const { verifyAdmin, verifyUser } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/messages/unread-count", verifyUser, getUnreadCount);
router.get("/admin/messages/unread-per-user", verifyAdmin, getAdminUnreadPerUser);

module.exports = router;
