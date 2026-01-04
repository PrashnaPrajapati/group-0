require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const db = require("./db"); // Make sure this exports your MySQL connection

const app = express();
const port = 5001;

// ---------------- MIDDLEWARE ----------------
app.use(cors({ origin: "http://localhost:3000", credentials: true })); // allow frontend
app.use(express.json()); // ✅ important to parse JSON bodies

// ---------------- NODEMAILER ----------------
const transporter = nodemailer.createTransport({
  service: "Gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------------- SIGNUP ----------------
app.post("/signup", async (req, res) => {
  try {
    const { fullName, phone, email, password, gender } = req.body;

    // ---------------- VALIDATE INPUT ----------------
    if (!fullName || !phone || !email || !password || !gender) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Full name validation: at least 2 words, letters only
    const nameRegex = /^[A-Za-z]+([ '-][A-Za-z]+)+$/;
    if (!nameRegex.test(fullName.trim())) {
      return res.status(400).json({ message: "Full name must be at least 2 words and letters only" });
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // Phone validation: exactly 10 digits
    const phoneDigits = phone.replace(/\D/g, "");
    if (!/^\d{10}$/.test(phoneDigits)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    // Password validation: 8+ chars, uppercase, lowercase, number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: "Password must be 8+ characters with uppercase, lowercase, and a number" });
    }

    if (password !== req.body.confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // ---------------- CHECK DUPLICATES ----------------
    const [existingEmail] = await db.promise().query(
      "SELECT id FROM users WHERE email = ?",
      [email.trim()]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const [existingPhone] = await db.promise().query(
      "SELECT id FROM users WHERE phone = ?",
      [phoneDigits]
    );
    if (existingPhone.length > 0) {
      return res.status(400).json({ message: "Phone number already exists" });
    }

    // ---------------- HASH PASSWORD ----------------
    const hashedPassword = await bcrypt.hash(password, 10);

    // ---------------- INSERT USER ----------------
    await db.promise().query(
      "INSERT INTO users (fullName, phone, email, password, gender) VALUES (?, ?, ?, ?, ?)",
      [fullName.trim(), phoneDigits, email.trim(), hashedPassword, gender]
    );

    return res.json({ message: "User registered successfully" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});


// ---------------- LOGIN ----------------
app.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    // ---------------- VALIDATE INPUT ----------------
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Trim email and password
    email = email.trim();
    password = password.trim();

    // Email format check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // ---------------- FETCH USER ----------------
    const [users] = await db.promise().query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = users[0];

    // ---------------- CHECK PASSWORD ----------------
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // ---------------- GENERATE JWT (minimal payload) ----------------
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || "user" },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    // ---------------- SEND RESPONSE ----------------
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
});

// ---------------- PASSWORD RESET ----------------

// Forgot password
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0)
      return res.json({ message: "If the email is registered, instructions sent" });

    const user = results[0];

    // Generate JWT token (15 minutes)
    const resetToken = jwt.sign({ id: user.id }, process.env.SECRET_KEY, { expiresIn: "15m" });

    // Make token URL-safe
    const resetTokenSafe = encodeURIComponent(resetToken);

    // Update DB with token and expiration handled by MySQL
    db.query(
      "UPDATE users SET resetToken = ?, resetExpires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?",
      [resetToken, user.id],
      (err) => {
        if (err) return res.status(500).json({ message: "Database error" });

        const resetLink = `http://localhost:3000/reset-password?token=${resetTokenSafe}`;
        console.log("Password reset link:", resetLink);

        // Send email
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Password Reset",
          text: `Click the link to reset your password:\n\n${resetLink}\n\nThis link expires in 15 minutes.`,
        });

        res.json({ message: "Reset instructions sent" });
      }
    );
  });
});

// Reset password
app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: "Missing token or password" });

  let payload;
  try {
    // Decode token (from URL-safe version)
    payload = jwt.verify(decodeURIComponent(token), process.env.SECRET_KEY);
  } catch {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  // Check token and expiration in DB
  db.query(
    `SELECT id FROM users WHERE id = ? AND resetToken = ? AND resetExpires > NOW()`,
    [payload.id, token],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (results.length === 0)
        return res.status(400).json({ message: "Invalid or expired token" });

      try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query(
          `UPDATE users SET password = ?, resetToken = NULL, resetExpires = NULL WHERE id = ?`,
          [hashedPassword, payload.id],
          (err) => {
            if (err) return res.status(500).json({ message: "Database error" });
            res.json({ message: "Password reset successful" });
          }
        );
      } catch {
        res.status(500).json({ message: "Error hashing password" });
      }
    }
  );
});


// ---------------- ADMIN MIDDLEWARE ----------------
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (decoded.role !== "admin") return res.status(403).json({ message: "Admins only" });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ---------------- ADMIN ROUTES ----------------
app.get("/admin/users", verifyAdmin, (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(results);
  });
});

// ---------------- START SERVER ----------------
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
