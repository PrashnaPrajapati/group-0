const express = require("express");
const { 
  changePassword,
  getProfile,
  removeProfilePhoto,
  updateProfile,
  updateProfilePhoto,
} = require("../controllers/profileController");
const { verifyUser } = require("../middleware/authMiddleware");
const { imageUpload } = require("../middleware/imageUpload");

const router = express.Router();
 
router.get("/profile", verifyUser, getProfile);
router.put("/profile", verifyUser, updateProfile);
router.put("/profile/change-password", verifyUser, changePassword);
router.put("/profile/photo", verifyUser, imageUpload("photo", "/users"), updateProfilePhoto);
router.delete("/profile/photo", verifyUser, removeProfilePhoto);

module.exports = router;
