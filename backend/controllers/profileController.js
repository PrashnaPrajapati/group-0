const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const Profile = require("../models/profileModel");

const uploadsDir = path.resolve(__dirname, "../uploads");

const removeUploadedPhotoFile = async (photoUrl) => {
  if (!photoUrl || !photoUrl.startsWith("/uploads/")) return;

  const filePath = path.resolve(__dirname, "..", photoUrl.replace(/^\//, ""));
  if (!filePath.startsWith(uploadsDir + path.sep)) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Failed to delete profile photo file:", err);
    }
  }
};

const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile) return res.status(404).json({ message: "User not found" });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, address } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ message: "Full name and phone are required" });
    }

    await Profile.updateProfile({
      id: req.user.id,
      fullName,
      phone: phone.replace(/\D/g, ""),
      address,
    });

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords required" });
    }

    const user = await Profile.findPasswordById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google sign-in. Use forgot password to create a password first.",
      });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: "Current password incorrect" });

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: "Password must be 8+ chars with upper, lower, number" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Profile.updatePassword(req.user.id, hashedPassword);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
};

const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("verifyUser did not set req.user!");
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      console.error("No file received in the request");
      return res.status(400).json({ message: "No file uploaded" });
    }

    const photoPath = req.file.imageUrl;
    console.log("Saving photo path to DB:", photoPath, "for user:", req.user.id);

    const existingProfile = await Profile.findById(req.user.id);
    const affectedRows = await Profile.updatePhoto(req.user.id, photoPath);
    if (affectedRows === 0) {
      console.warn("No user found with id:", req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    if (existingProfile?.photoUrl !== photoPath) {
      await removeUploadedPhotoFile(existingProfile?.photoUrl);
    }

    console.log("Photo updated successfully for user:", req.user.id);
    res.json({ message: "Profile photo updated", photoUrl: photoPath });
  } catch (err) {
    console.error("Unexpected server error in /profile/photo:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

const removeProfilePhoto = async (req, res) => {
  try {
    const existingProfile = await Profile.findById(req.user.id);
    const affectedRows = await Profile.removePhoto(req.user.id);
    if (affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await removeUploadedPhotoFile(existingProfile?.photoUrl);

    res.json({ message: "Profile photo removed", photoUrl: null });
  } catch (err) {
    console.error("Unexpected server error in DELETE /profile/photo:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  changePassword,
  getProfile,
  removeProfilePhoto,
  updateProfile,
  updateProfilePhoto,
};
