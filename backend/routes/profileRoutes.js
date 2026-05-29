const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  changePassword,
  getProfile,
  removeProfilePhoto,
  updateProfile,
  updateProfilePhoto,
} = require("../controllers/profileController");
const { verifyUser } = require("../middleware/authMiddleware");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `user-${req.user.id}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

router.get("/profile", verifyUser, getProfile);
router.put("/profile", verifyUser, updateProfile);
router.put("/profile/change-password", verifyUser, changePassword);
router.put("/profile/photo", verifyUser, upload.single("photo"), updateProfilePhoto);
router.delete("/profile/photo", verifyUser, removeProfilePhoto);

module.exports = router;
