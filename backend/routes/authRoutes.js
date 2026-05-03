const express = require("express");
const {
  forgotPassword,
  googleLogin,
  login,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
} = require("../controllers/authController");

const router = express.Router();

router.get("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/google-login", googleLogin);
router.post("/login", login);
router.post("/resend-verification", resendVerification);
router.post("/reset-password", resetPassword);
router.post("/signup", signup);

module.exports = router;
