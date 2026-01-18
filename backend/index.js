require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const db = require("./db");

const app = express();
const port = 5001;

app.use(cors({ origin: "http://localhost:3000", credentials: true })); 
app.use(express.json());


const transporter = nodemailer.createTransport({
  service: "Gmail", 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


app.post("/signup", async (req, res) => {
  try {
    const { fullName, phone, email, password, gender } = req.body;


    if (!fullName || !phone || !email || !password || !gender) {
      return res.status(400).json({ message: "All fields are required" });
    }

    
    const nameRegex = /^[A-Za-z]+([ '-][A-Za-z]+)+$/;
    if (!nameRegex.test(fullName.trim())) {
      return res.status(400).json({ message: "Full name must be at least 2 words and letters only" });
    }

  
    const allowedProviders = [
      "gmail", "yahoo", "hotmail", "outlook", "icloud",
      "aol", "protonmail", "zoho", "gmx", "mail"
    ];
    const allowedTLDs = [
      "com", "edu", "io", "org", "net", "co", "gov",
      "in", "ai", "app", "dev"
    ];
    const emailRegex = new RegExp(
      `^[a-zA-Z0-9._%+-]+@(${allowedProviders.join("|")})\\.(${allowedTLDs.join("|")})$`,
      "i"
    );
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: "Email must be from a specific provider and TLD" });
    }
    
    const phoneDigits = phone.replace(/\D/g, "");
    if (!/^\d{10}$/.test(phoneDigits)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: "Password must be 8+ characters with uppercase, lowercase, and a number" });
    }

    if (password !== req.body.confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

  
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

  
    const hashedPassword = await bcrypt.hash(password, 10);

   
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



app.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;


    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

   
    email = email.trim();
    password = password.trim();

   
    const allowedProviders = [
      "gmail", "yahoo", "hotmail", "outlook", "icloud",
      "aol", "protonmail", "zoho", "gmx", "mail"
    ];
    const allowedTLDs = [
      "com", "edu", "io", "org", "net", "co", "gov",
      "in", "ai", "app", "dev"
    ];
    const emailRegex = new RegExp(
      `^[a-zA-Z0-9._%+-]+@(${allowedProviders.join("|")})\\.(${allowedTLDs.join("|")})$`,
      "i"
    );
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }


    const [users] = await db.promise().query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = users[0];

    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || "user" },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
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
});







app.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0)
      return res.json({ message: "If the email is registered, instructions sent" });

    const user = results[0];

  
    const resetToken = jwt.sign({ id: user.id }, process.env.SECRET_KEY, { expiresIn: "15m" });

    
    const resetTokenSafe = encodeURIComponent(resetToken);

   
    db.query(
      "UPDATE users SET resetToken = ?, resetExpires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?",
      [resetToken, user.id],
      (err) => {
        if (err) return res.status(500).json({ message: "Database error" });

        const resetLink = `http://localhost:3000/reset-password?token=${resetTokenSafe}`;
        console.log("Password reset link:", resetLink);

        
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


app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: "Missing token or password" });

  let payload;
  try {
   
    payload = jwt.verify(decodeURIComponent(token), process.env.SECRET_KEY);
  } catch {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

 
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


app.get("/admin/users", verifyAdmin, (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(results);
  });
});

// Public services (users see ONLY active)
app.get("/services", (req, res) => {
  db.query(
    "SELECT * FROM services WHERE status = 'active'",
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json(results);
    }
  );
});

app.post("/admin/services", verifyAdmin, (req, res) => {
  const { name, description, price, duration } = req.body;

  if (!name || !price || !duration) {
    return res.status(400).json({ message: "All fields required" });
  }

  db.query(
    "INSERT INTO services (name, description, price, duration) VALUES (?, ?, ?, ?)",
    [name, description, price, duration],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Service added successfully" });
    }
  );
});

app.get("/admin/services", verifyAdmin, (req, res) => {
  db.query("SELECT * FROM services", (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(results);
  });
});

app.put("/admin/services/:id", verifyAdmin, (req, res) => {
  const { name, description, price, duration } = req.body;

  db.query(
    "UPDATE services SET name=?, description=?, price=?, duration=? WHERE id=?",
    [name, description, price, duration, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Service updated" });
    }
  );
});

app.put("/admin/services/:id/inactive", verifyAdmin, (req, res) => {
  db.query(
    "UPDATE services SET status = 'inactive' WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Service marked as inactive" });
    }
  );
});

app.put("/admin/services/:id/active", verifyAdmin, (req, res) => {
  db.query(
    "UPDATE services SET status = 'active' WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Service marked as active" });
    }
  );
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
