const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/userModel");

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const WARNING_FAILED_LOGIN_ATTEMPTS = 3;
const LOGIN_LOCK_MINUTES = 15;

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const allowedProviders = [
  "gmail",
  "yahoo",
  "hotmail",
  "outlook",
  "icloud",
  "aol",
  "protonmail",
  "zoho",
  "gmx",
  "mail",
];

const allowedTLDs = [
  "com",
  "edu",
  "io",
  "org",
  "net",
  "co",
  "gov",
  "in",
  "ai",
  "app",
  "dev",
];

const emailRegex = new RegExp(
  `^[a-zA-Z0-9._%+-]+@(${allowedProviders.join("|")})\\.(${allowedTLDs.join("|")})$`,
  "i"
);

const validateSignup = ({ fullName, phone, email, password, gender }) => {
  if (!fullName || !phone || !email || !password || !gender) {
    return "All fields are required";
  }

  const nameRegex = /^[A-Za-z]+([ '-][A-Za-z]+)+$/;
  if (!nameRegex.test(fullName.trim())) {
    return "Full name must be at least 2 words and letters only";
  }

  if (!emailRegex.test(email.trim())) {
    return "Email must be from a specific provider and TLD";
  }

  const phoneDigits = phone.replace(/\D/g, "");
  if (!/^\d{10}$/.test(phoneDigits)) {
    return "Phone number must be exactly 10 digits";
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return "Password must be 8+ characters with uppercase, lowercase, and a number";
  }

  return null;
};

const validateLogin = ({ email, password }) => {
  if (!email || !password) {
    return "Email and password are required";
  }

  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address.";
  }

  return null;
};

const validateResetPassword = ({ token, newPassword }) => {
  if (!token || !newPassword) {
    return "Missing token or password";
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return "Password must be 8+ characters and include uppercase, lowercase, number, and special character";
  }

  return null;
};

const getRemainingLockMinutes = (lockUntil) => {
  const millisecondsRemaining = new Date(lockUntil).getTime() - Date.now();
  return Math.max(1, Math.ceil(millisecondsRemaining / 60000));
};

const sendLoginLockEmail = async (user) => {
  if (!user.email) return;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Singar Glow account temporarily locked",
    text: `Hello ${user.fullName || ""},\n\nWe temporarily locked your Singar Glow account because there were too many incorrect password attempts.\n\nIf this was you, please wait ${LOGIN_LOCK_MINUTES} minutes and try again. If this was not you, please reset your password from the forgot password page.\n\nThank you,\nThe Singar Glow Team`,
  });
};

const sendVerificationEmail = async (user, token) => {
  const frontendBaseUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  const verificationLink = `${frontendBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Verify your Singar Glow email",
    text: `Hello ${user.fullName || ""},\n\nPlease verify your Singar Glow account by clicking the link below:\n${verificationLink}\n\nThis link will expire in 24 hours. If you did not create this account, you can ignore this email.\n\nThank you,\nThe Singar Glow Team`,
  });
};

const signup = async (req, res) => {
  try {
    const { fullName, phone, email, password, gender } = req.body;
    const validationError = validateSignup({ fullName, phone, email, password, gender });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedUser = {
      fullName: fullName.trim(),
      phone: phone.replace(/\D/g, ""),
      email: email.trim(),
      password,
      gender,
    };

    await User.deleteExpiredUnverifiedUserByEmail(normalizedUser.email);

    const existingEmail = await User.findByEmail(normalizedUser.email);
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingPhone = await User.findByPhone(normalizedUser.phone);
    if (existingPhone) {
      return res.status(400).json({ message: "Phone number already exists" });
    }

    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    await User.createUser({
      ...normalizedUser,
      emailVerificationToken,
    });
    await sendVerificationEmail(normalizedUser, emailVerificationToken);

    return res.json({ message: "Registration successful. Please check your email and verify your account before logging in." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const trimmedEmail = email?.trim();

    if (!trimmedEmail) {
      return res.status(400).json({ message: "Email required" });
    }

    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const user = await User.findLoginUserByEmail(trimmedEmail);
    if (!user) {
      return res.status(404).json({ message: "Please enter a valid registered email address." });
    }

    if (user.isEmailVerified === 0 || user.isEmailVerified === false) {
      return res.status(403).json({
        message: "Please verify your email before resetting your password.",
      });
    }

    const resetToken = jwt.sign({ id: user.id }, process.env.SECRET_KEY, { expiresIn: "15m" });
    const resetTokenSafe = encodeURIComponent(resetToken);

    await User.saveResetToken(user.id, resetToken);

    const resetLink = `http://localhost:3000/reset-password?token=${resetTokenSafe}`;
    console.log("Password reset link:", resetLink);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: trimmedEmail,
      subject: "Password Reset",
      text: `Hello,\n\nWe received a request to reset your password for your Singar Glow account.\n\nTo reset your password, please click the link below:\n${resetLink}\n\nThis link will expire in 15 minutes. Please make sure to use it before then. If you didn't request a password reset, you can safely ignore this email.\n\nThank you,\nThe Singar Glow Team`,
    });

    return res.json({ message: "Reset instructions sent" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Database error" });
  }
};

const login = async (req, res) => {
  try {
    const { rememberMe } = req.body;
    let { email, password } = req.body;
    const validationError = validateLogin({ email, password });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    email = email.trim();
    password = password.trim();

    const user = await User.findLoginUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.blocked) { 
      return res.status(403).json({
        message: "Your account has been blocked. Please contact support.",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google sign-in. Continue with Google or reset your password to create one.",
      });
    }

    if (user.isEmailVerified === 0 || user.isEmailVerified === false) {
      return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    const lockUntil = user.lockUntil ? new Date(user.lockUntil) : null;
    const isLocked = lockUntil && lockUntil.getTime() > Date.now();
    if (isLocked) {
      return res.status(423).json({
        message: `Too many failed login attempts. Try again after ${getRemainingLockMinutes(lockUntil)} minutes.`,
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      const currentAttempts = lockUntil ? 0 : Number(user.failedLoginAttempts || 0);
      const failedLoginAttempts = currentAttempts + 1;

      if (failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        const nextLockUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60000);
        await User.updateFailedLogin(user.id, failedLoginAttempts, nextLockUntil);
        await sendLoginLockEmail(user);

        return res.status(423).json({
          message: `Too many failed login attempts. Try again after ${LOGIN_LOCK_MINUTES} minutes.`,
        });
      }

      await User.updateFailedLogin(user.id, failedLoginAttempts);

      if (failedLoginAttempts >= WARNING_FAILED_LOGIN_ATTEMPTS) {
        const attemptsRemaining = MAX_FAILED_LOGIN_ATTEMPTS - failedLoginAttempts;
        return res.status(401).json({
          message: `Incorrect password. ${attemptsRemaining} ${attemptsRemaining === 1 ? "attempt" : "attempts"} remaining before temporary lock.`,
        });
      }

      return res.status(401).json({ message: "Incorrect password" });
    }

    await User.resetFailedLogin(user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || "user" },
      process.env.SECRET_KEY,
      { expiresIn: rememberMe ? "30d" : "1h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role || "user",
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findLoginUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    await User.deleteExpiredUnverifiedUsers();

    const user = await User.findLoginUserByEmail(email.trim());
    if (!user) {
      return res.json({ message: "If the email is registered and unverified, a verification link has been sent." });
    }

    if (user.isEmailVerified === 1 || user.isEmailVerified === true) {
      return res.status(400).json({ message: "Email is already verified. Please log in." });
    }

    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    await User.saveEmailVerificationToken(user.id, emailVerificationToken);
    await sendVerificationEmail(user, emailVerificationToken);

    return res.json({ message: "Verification link sent. Please check your email." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  const validationError = validateResetPassword({ token, newPassword });

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  let payload;
  try {
    payload = jwt.verify(decodeURIComponent(token), process.env.SECRET_KEY);
  } catch {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  try {
    const resetUser = await User.findByValidResetToken(payload.id, token);
    if (!resetUser) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (resetUser.password) {
      const isSamePassword = await bcrypt.compare(newPassword, resetUser.password);
      if (isSamePassword) {
        return res.status(400).json({ message: "New password cannot be the same as the previous password" });
      }
    }

    await User.updatePasswordAndClearResetToken(payload.id, newPassword);

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error processing password" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Verification token is required." });
    }

    const user = await User.findByValidEmailVerificationToken(token);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification link." });
    }

    await User.verifyEmail(user.id);

    return res.json({ message: "Email verified successfully. You can now log in." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  forgotPassword,
  googleLogin,
  login,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
};
