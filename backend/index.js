require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const app = express();
const port = 5001;

app.use(cors());


app.get("/forgot-password-debug", (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ message: "Email required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error", error: err.message });
    if (results.length === 0) return res.status(200).json({ message: "If the email is registered, instructions sent", token: null });

    const user = results[0];
    const resetToken = jwt.sign({ id: user.id }, process.env.SECRET_KEY, { expiresIn: "15m" });
    return res.status(200).json({ message: "Reset token generated (debug)", token: resetToken });
  });
});

  
  app.post("/forgot-password", (req, res) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
    console.log('[/forgot-password] raw body length:', raw.length, 'preview:', raw.slice(0,200));
    let parsed;
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch (e) {
        return res.status(400).json({ message: "Invalid JSON body", error: e.message });
      }

      const email = parsed.email;
      if (!email) return res.status(400).json({ message: "Email required" });

      db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error", error: err.message });

        if (results.length === 0) {
         
          return res.status(200).json({ message: "If the email is registered, instructions sent" });
        }

        const user = results[0];
        const resetToken = jwt.sign({ id: user.id }, process.env.SECRET_KEY, { expiresIn: "15m" });
        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

        
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); 

        
        db.query("SHOW COLUMNS FROM users", (colErr, colRes) => {
          if (colErr) {
            console.error('Error checking users columns:', colErr);
            return;
          }

          const cols = (colRes || []).map(c => c.Field);
          const tokenCol = cols.includes('resetToken') ? 'resetToken' : (cols.includes('reset_token') ? 'reset_token' : null);
          const expiresCol = cols.includes('resetExpires') ? 'resetExpires' : (cols.includes('reset_token_expires') ? 'reset_token_expires' : null);

          const doUpdate = (tCol, eCol) => {
            const sql = `UPDATE users SET ${tCol} = ?, ${eCol} = ? WHERE id = ?`;
            db.query(sql, [resetToken, expiresAt, user.id], (updateErr) => {
              if (updateErr) console.error('Failed to store reset token:', updateErr);
              else console.log(`Stored reset token for user id=${user.id} into columns ${tCol}, ${eCol}`);
            });
          };

          if (tokenCol && expiresCol) {
            doUpdate(tokenCol, expiresCol);
          } else if (!tokenCol && !expiresCol) {
            
            const alterSql = `ALTER TABLE users ADD COLUMN reset_token VARCHAR(255), ADD COLUMN reset_token_expires DATETIME`;
            db.query(alterSql, (alterErr) => {
              if (alterErr) {
                console.error('Failed to add reset token columns:', alterErr);
              } else {
                console.log('Added reset_token and reset_token_expires columns to users table');
              }
             
              doUpdate('reset_token', 'reset_token_expires');
            });
          } else {
            
            if (tokenCol && !expiresCol) {
              const alterSql = `ALTER TABLE users ADD COLUMN reset_token_expires DATETIME`;
              db.query(alterSql, (alterErr) => {
                if (alterErr) console.error('Failed to add expires column:', alterErr);
                doUpdate(tokenCol, expiresCol || 'reset_token_expires');
              });
            } else if (!tokenCol && expiresCol) {
              const alterSql = `ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)`;
              db.query(alterSql, (alterErr) => {
                if (alterErr) console.error('Failed to add token column:', alterErr);
                doUpdate(tokenCol || 'reset_token', expiresCol);
              });
            }
          }
        });

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Password Reset",
          text: `Click the link to reset your password: ${resetLink}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Email send error:", error);
            return res.status(200).json({
              message: "Reset token generated (email send failed - check server logs)",
              token: resetToken,
              error: error.message,
            });
          }
          console.log("Email sent:", info.response);
          return res.status(200).json({ message: "Reset instructions sent", token: resetToken });
        });
      });
    });
  });



const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) console.log("DB connection error:", err);
  else console.log("Connected to MySQL");
});


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


app.use(express.json());


app.post("/signup", async (req, res) => {
  const { fullName, phone, email, password, gender } = req.body;
  if (!fullName || !phone || !email || !password || !gender) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length > 0) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (fullName, phone, email, password, gender) VALUES (?, ?, ?, ?, ?)",
      [fullName, phone, email, hashedPassword, gender],
      (err) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.status(200).json({ message: "User registered successfully" });
      }
    );
  });
});


app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(401).json({ message: "User not found" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.SECRET_KEY, { expiresIn: "1h" });

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email }
    });
  });
});


app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: "Missing token or password" });


  let payload;
  try {
    payload = jwt.verify(token, process.env.SECRET_KEY);
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  const userId = payload.id;

  db.query("SHOW COLUMNS FROM users", (colErr, colRes) => {
    if (colErr) return res.status(500).json({ message: "Database error", error: colErr.message });

    const cols = (colRes || []).map(c => c.Field);
    const tokenCol = cols.includes('resetToken') ? 'resetToken' : (cols.includes('reset_token') ? 'reset_token' : null);
    const expiresCol = cols.includes('resetExpires') ? 'resetExpires' : (cols.includes('reset_token_expires') ? 'reset_token_expires' : null);

    if (!tokenCol || !expiresCol) {
      return res.status(500).json({ message: 'Reset token columns missing in DB. Add resetToken/resetExpires or reset_token/reset_token_expires.' });
    }

    const selectSql = `SELECT id FROM users WHERE id = ? AND ${tokenCol} = ? AND ${expiresCol} > NOW()`;
    db.query(selectSql, [userId, token], async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error", error: err.message });
      if (results.length === 0) return res.status(400).json({ message: "Invalid or expired token" });

      try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateSql = `UPDATE users SET password = ?, ${tokenCol} = NULL, ${expiresCol} = NULL WHERE id = ?`;
        db.query(updateSql, [hashedPassword, userId], (updateErr) => {
          if (updateErr) return res.status(500).json({ message: "Database error", error: updateErr.message });
          return res.status(200).json({ message: "Password reset successful" });
        });
      } catch (hashErr) {
        return res.status(500).json({ message: "Server error", error: hashErr.message });
      }
    });
  });
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
