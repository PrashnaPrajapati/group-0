require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const http = require('http');
const socketIo = require('socket.io');
const vader = require('vader-sentiment');
const db = require("./db");
const { initializeChat } = require("./chatHandler");

const app = express();
const port = 5001;
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",  
    methods: ["GET", "POST"]
  }
});


let users = {};
let admin = {};

const fs = require("fs");
const uploadDir = "uploads";
 
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("Created uploads directory");
}

const multer = require("multer");
const path = require("path");

app.use(cors({ origin: "http://localhost:3000", credentials: true })); 
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.static('public'));

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
 
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      message:
        "Password must be 8+ characters and include uppercase, lowercase, number, and special character",
    });
  }

  let payload;
  try {

    payload = jwt.verify(decodeURIComponent(token), process.env.SECRET_KEY);
  } catch {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  db.query(
    `SELECT password FROM users WHERE id = ? AND resetToken = ? AND resetExpires > NOW()`,
    [payload.id, token],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (results.length === 0)
        return res.status(400).json({ message: "Invalid or expired token" });

      try {
        const currentHashedPassword = results[0].password;
 
        const isSamePassword = await bcrypt.compare(newPassword, currentHashedPassword);
        if (isSamePassword) {
          return res.status(400).json({ message: "New password cannot be the same as the previous password" });
        }
 
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
        res.status(500).json({ message: "Error processing password" });
      }
    }
  );
});
 
app.get("/", (req, res) => {
  res.send("Chat server is running!");
});

// Initialize chat system
initializeChat(io);

 
const getReceiverByRole = (receiverId, senderRole) => {
  return new Promise((resolve, reject) => {
    const role = senderRole === "users" ? "admin" : "users";
    const query = "SELECT id, socketId FROM users WHERE id = ? AND role = ? LIMIT 1"; 
    db.query(query, [receiverId, role], (err, result) => {
      if (err) return reject(err);
      if (result.length > 0) {
        resolve(result[0]);  
      } else {
        reject("Receiver not found.");
      }
    });
  });
};
 
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

const serviceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/services";

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = Date.now() + ext;
    cb(null, fileName);
  },
});

const serviceUpload = multer({ storage: serviceStorage });
 
app.get("/services", (req, res) => {
  db.query(
    "SELECT * FROM services WHERE status = 'active'",
    (err, results) => {
      if (err) {
        console.error("SERVICES ERROR:", err);
        return res.status(500).json({ message: "Database error" });
      }

      console.log("SERVICES RESULT:", results);
      res.json(results);
    }
  );
});
 
app.post("/admin/services",verifyAdmin,serviceUpload.single("image"),
  (req, res) => {
    const { name, description, price, duration, gender, category } = req.body;

    if (!name || !price || !duration || !gender || !category) {
      return res.status(400).json({ message: "All fields required" });
    }

    const nameClean = name.trim();
    const imagePath = req.file
      ? `/uploads/services/${req.file.filename}`
      : null;

    db.query(
      "SELECT id FROM services WHERE LOWER(name) = LOWER(?)",
      [nameClean],
      (err, results) => {
        if (err) return res.status(500).json({ message: "DB error" });

        if (results.length > 0) {
          return res
            .status(400)
            .json({ message: "Service with this name already exists" });
        }

        db.query(
          "INSERT INTO services (name, description, price, duration, gender, category, image, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())",
          [nameClean, description, price, duration, gender, category, imagePath],
          (err) => {
            if (err) {
              console.log(err);
              return res.status(500).json({ message: "DB error" });
            }

            res.json({ message: "Service added successfully" });
          }
        );
      }
    );
  }
);
app.get("/admin/services", verifyAdmin, (req, res) => {
  db.query("SELECT * FROM services", (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (!results) return res.status(500).json({ message: "No results found" });
    res.json(results);
  });
});
 
app.put(
  "/admin/services/:id",
  verifyAdmin,
  serviceUpload.single("image"),
  (req, res) => {
    const { name, description, price, duration, gender, category} = req.body;
    const serviceId = req.params.id;

    const imagePath = req.file
      ? `/uploads/services/${req.file.filename}`
      : null;

    const nameClean = name.trim();

    db.query(
      "SELECT id FROM services WHERE LOWER(name)=LOWER(?) AND id!=?",
      [nameClean, serviceId],
      (err, results) => {
        if (err) return res.status(500).json({ message: "DB error" });

        if (results.length > 0) {
          return res
            .status(400)
            .json({ message: "Another service with this name already exists" });
        }

        let query =
          "UPDATE services SET name=?, description=?, price=?, duration=? , gender=?, category=?";
        let params = [nameClean, description, price, duration, gender, category];

        if (imagePath) {
          query += ", image=?";
          params.push(imagePath);
        }

        query += " WHERE id=?";
        params.push(serviceId);

        db.query(query, params, (err) => {
          if (err) return res.status(500).json({ message: "DB error" });

          res.json({ message: "Service updated successfully" });
        });
      }
    );
  }
);

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

const verifyUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded; 
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
 
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"), // folder for uploaded images
  filename: (req, file, cb) => cb(null, `user-${req.user.id}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });


app.get("/profile", verifyUser, (req, res) => {
  const userId = req.user.id;
  db.query(
  "SELECT id, fullName, email, phone, gender, address, photoUrl FROM users WHERE id = ?",
  [userId],
  (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (results.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(results[0]);
  }
);
});


app.put("/profile", verifyUser, (req, res) => {
  const userId = req.user.id;
  const { fullName, phone, address } = req.body;

  if (!fullName || !phone) {
    return res.status(400).json({ message: "Full name and phone are required" });
  }

  const phoneDigits = phone.replace(/\D/g, "");
  db.query(
    "UPDATE users SET fullName=?, phone=?, address=? WHERE id=?",
    [fullName, phoneDigits, address || null, userId],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Profile updated successfully" });
    }
  );
});

app.post("/google-login", async (req, res) => {
  try {
    const { email } = req.body;

    const [results] = await db.promise().query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = results[0];

    // ✅ Generate SAME JWT as normal login
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


app.put("/profile/change-password", verifyUser, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both passwords required" });

  db.query("SELECT password FROM users WHERE id=?", [userId], async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (results.length === 0) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(currentPassword, results[0].password);
    if (!match) return res.status(400).json({ message: "Current password incorrect" });

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) return res.status(400).json({ message: "Password must be 8+ chars with upper, lower, number" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.query("UPDATE users SET password=? WHERE id=?", [hashedPassword, userId], (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Password changed successfully" });
    });
  });
});


app.put("/profile/photo", verifyUser, upload.single("photo"), (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("verifyUser did not set req.user!");
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      console.error("No file received in the request");
      return res.status(400).json({ message: "No file uploaded" });
    }

    const photoPath = `/uploads/${req.file.filename}`;
    console.log("Saving photo path to DB:", photoPath, "for user:", req.user.id);

    db.query(
      "UPDATE users SET photoUrl=? WHERE id=?",
      [photoPath, req.user.id],
      (err, result) => {
        if (err) {
          console.error("DB error updating photoUrl:", err);
          return res.status(500).json({ message: "DB error", error: err });
        }

        if (result.affectedRows === 0) {
          console.warn("No user found with id:", req.user.id);
          return res.status(404).json({ message: "User not found" });
        }

        console.log("Photo updated successfully for user:", req.user.id);
        res.json({ message: "Profile photo updated", photoUrl: photoPath });
      }
    );
  } catch (err) {
    console.error("Unexpected server error in /profile/photo:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});
 
app.post("/bookings", verifyUser, (req, res) => {
  const { service_ids, package_id, booking_date, booking_time, notes, location_type, address } = req.body;
  const user_id = req.user.id;

  // ✅ Validate
  if (!booking_date || !booking_time) {
    return res.status(400).json({ message: "Date and time are required" });
  }

  if (!location_type || (location_type === "home" && !address)) {
    return res.status(400).json({ message: "Location and address are required" });
  }

  // ✅ Must have either service OR package
  if ((!service_ids || service_ids.length === 0) && !package_id) {
    return res.status(400).json({ message: "Select at least one service or a package" });
  }

  // --------------------------
  // ✅ PACKAGE BOOKING
  // --------------------------
  if (package_id) {
    db.query(
      `INSERT INTO bookings 
       (user_id, package_id, booking_date, booking_time, notes, status, location_type, address)
       VALUES (?, ?, ?, ?, ?, 'upcoming', ?, ?)`,
      [user_id, package_id, booking_date, booking_time, notes || null, location_type, address || null],
      (err, result) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });

        return res.json({
          message: "Package booking successful",
          bookingId: result.insertId,
        });
      }
    );

    return;
  }

  // --------------------------
  // ✅ SERVICE BOOKING
  // --------------------------
  const insertedBookingIds = [];

  const insertNext = (index) => {
    if (index >= service_ids.length) {
      return res.json({
        message: "Booking successful",
        bookingIds: insertedBookingIds,
      });
    }

    const service_id = service_ids[index];

    db.query(
      `INSERT INTO bookings 
       (user_id, service_id, booking_date, booking_time, notes, status, location_type, address)
       VALUES (?, ?, ?, ?, ?, 'upcoming', ?, ?)`,
      [user_id, service_id, booking_date, booking_time, notes || null, location_type, address || null],
      (err, result) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });

        insertedBookingIds.push(result.insertId);
        insertNext(index + 1);
      }
    );
  };

  insertNext(0);
});
  
app.get("/bookings/my", verifyUser, (req, res) => {
  const user_id = req.user.id;

  db.query(
    `SELECT 
      b.id,
      b.booking_date, 
      b.booking_time,
      b.notes,
      b.status,

      b.package_id,

      s.name AS service_name,
      s.price AS service_price,

      p.name AS package_name,
      p.price AS package_price

    FROM bookings b
    LEFT JOIN services s ON b.service_id = s.id
    LEFT JOIN packages p ON b.package_id = p.id

    WHERE b.user_id = ?
    ORDER BY b.id DESC`,
    [user_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(results);
    }
  );
});

app.get("/admin/bookings", verifyAdmin, (req, res) => {
  db.query(
    `SELECT b.id, 
            u.fullName AS user, 
            s.name AS service, 
            p.name AS package, 
            b.booking_date, 
            b.booking_time, 
            b.notes, 
            b.status, 
            s.price AS service_price,
            p.price AS package_price
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     LEFT JOIN services s ON b.service_id = s.id
     LEFT JOIN packages p ON b.package_id = p.id`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });

      console.log("API Bookings Data:", results); 
      res.json(results);
    }
  );
});

app.put("/bookings/:id/cancel", verifyUser, (req, res) => {
  db.query(
    "UPDATE bookings SET status='cancelled' WHERE id=? AND user_id=?",
    [req.params.id, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Booking cancelled" });
    }
  );
});
 
app.put("/bookings/:id/reschedule", (req, res) => {
  const bookingId = req.params.id;
  let { booking_date, booking_time, location_type, reason, address } = req.body;
 
  db.query(
    "SELECT * FROM bookings WHERE id = ?",
    [bookingId],
    (err, results) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ message: "Internal server error", error: err });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const booking = results[0];
 
      booking_date = booking_date || booking.booking_date;
      booking_time = booking_time || booking.booking_time;
      location_type = location_type || booking.location_type || "salon";
      address = location_type === "home" ? (address || booking.address || "") : "salon";

      if (!booking_date) return res.status(400).json({ message: "Booking date is required" });
      if (!booking_time) return res.status(400).json({ message: "Booking time is required" });

      if (booking_time.length === 5) booking_time += ":00";

      db.query(
        `UPDATE bookings 
         SET booking_date=?, booking_time=?, location_type=?, address=?, notes=COALESCE(?, notes)
         WHERE id=?`,
        [booking_date, booking_time, location_type, address, reason, bookingId],
        (err) => {
          if (err) {
            console.error("DB Error:", err);
            return res.status(500).json({ message: "Internal server error", error: err });
          }

          res.json({ message: "Booking rescheduled successfully" });
        }
      );
    }
  );
});

app.put('/admin/bookings/:id/status', (req, res) => {
  const bookingId = req.params.id; 
  const { status } = req.body;     
 
  db.query('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, rows) => {
    if (err) {
      console.error('Error fetching booking:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
 
    db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId], (updateErr, result) => {
      if (updateErr) {
        console.error('Error updating booking status:', updateErr);
        return res.status(500).json({ message: 'Server error' });
      }

      return res.status(200).json({ message: 'Booking status updated successfully' });
    });
  });
});
 
app.get("/bookings/booked-slots", (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }
 
  db.query(
    `SELECT b.booking_time, s.duration AS service_duration
     FROM bookings b
     JOIN services s ON b.service_id = s.id
     WHERE b.booking_date = ? AND b.status = 'upcoming'`,
    [date],
    (err, results) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ message: "DB error", error: err });
      }

      const blockedSlots = [];

      results.forEach((booking) => { 
        let [hour, minute] = booking.booking_time.split(":").map(Number); 
        const duration = Number(String(booking.service_duration).replace(/\D/g, ""));
        const slotCount = Math.ceil(duration / 60); 

        for (let i = 0; i < slotCount; i++) {
          const h = hour + i;
          const slotStr = `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
          blockedSlots.push(slotStr);
        }
      }); 
      const uniqueBlockedSlots = [...new Set(blockedSlots)];

      res.json(uniqueBlockedSlots);
    }
  );
});


app.post("/bookings/:id/feedback", verifyUser, async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user?.id;
  const { rating, feedback } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: User not logged in" });
  }

  if (!rating || !feedback) {
    return res.status(400).json({ message: "Rating and feedback are required" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }
 
  try {
    const [bookingRows] = await db.promise().query(
      "SELECT * FROM bookings WHERE id = ?",
      [bookingId]
    );
    if (bookingRows.length === 0) { 
      return res.status(404).json({ message: "Booking not found" });
    }

    const [existing] = await db.promise().query(
      "SELECT * FROM feedback WHERE booking_id = ? AND user_id = ?",
      [bookingId, userId]
    );
    if (existing.length > 0) { 
      return res.status(400).json({ message: "Feedback already submitted for this booking" });
    }

    await db.promise().query(
      "INSERT INTO feedback (booking_id, user_id, rating, feedback_text, created_at) VALUES (?, ?, ?, ?, NOW())",
      [bookingId, userId, rating, feedback]
    );

    await db.promise().query(
      "UPDATE bookings SET feedback_submitted = TRUE WHERE id = ?",
      [bookingId]
    );

    return res.json({ message: "Feedback submitted successfully" });
  } catch (err) { 
    console.error("Feedback route error:", err.stack || err);
    return res.status(500).json({ message: "Database error occurred", error: err.message });
  }
});

app.get("/bookings/:id/feedback", async (req, res) => {
  const bookingId = req.params.id;

  try {
    const [rows] = await db.promise().query(
      `SELECT u.fullname AS customer, f.rating, f.feedback_text, f.created_at
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       WHERE f.booking_id = ?`,
      [bookingId]
    );

    res.json({
      bookingId,
      feedbacks: rows.map(f => ({
        customer: f.customer,
        rating: f.rating,
        feedback: f.feedback_text,
        submittedAt: f.created_at
      }))
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

// Admin list all feedbacks
app.get("/feedback", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT f.booking_id AS bookingId, u.fullname AS customer, f.rating, f.feedback_text AS feedback, f.created_at
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       ORDER BY f.created_at DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

const packageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/packages";

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = Date.now() + ext;
    cb(null, fileName);
  },
});

const packageUpload = multer({ storage: packageStorage });
 
app.post("/admin/packages", verifyAdmin, packageUpload.single("image"), (req, res) => {
  const { name, description, price, duration, status = "active", service_ids } = req.body;
  const image = req.file ? req.file.filename : null;

  let servicesArray;
  try {
    servicesArray = JSON.parse(service_ids); 
  } catch {
    return res.status(400).json({ message: "Invalid services format" });
  }

  if (!name || !price || !servicesArray || !Array.isArray(servicesArray)) {
    return res.status(400).json({ message: "Name, price and services required" });
  }

  db.query(
    "SELECT id FROM packages WHERE LOWER(name) = LOWER(?)",
    [name],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });
      if (rows.length > 0) return res.status(400).json({ message: "Package name already exists" });

      db.query(
        "INSERT INTO packages (name, description, price, duration, status, image) VALUES (?, ?, ?, ?, ?, ?)",
        [name, description || null, price, duration, status, image],
        (err, result) => {
          if (err) return res.status(500).json({ message: "DB error", error: err });

          const package_id = result.insertId;
          const values = servicesArray.map((service_id) => [package_id, service_id]);

          db.query(
            "INSERT INTO package_services (package_id, service_id) VALUES ?",
            [values],
            (err) => {
              if (err) return res.status(500).json({ message: "Failed to add services" });

              res.json({ message: "Package created successfully" });
            }
          );
        }
      );
    }
  );
});
 
app.put("/admin/packages/:id", verifyAdmin, packageUpload.single("image"), (req, res) => {

  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  const name = req.body?.name;
  const description = req.body?.description;
  const price = req.body?.price;
  const duration = req.body?.duration;
  const service_ids = req.body?.service_ids;

  const package_id = req.params.id;

  let services = [];

  try {
    services = service_ids ? JSON.parse(service_ids) : [];
  } catch (e) {
    return res.status(400).json({ message: "Invalid service_ids format" });
  }
 
  let query = "UPDATE packages SET name=?, description=?, price=?, duration=?, status=?";
  let params = [name, description || null, price, duration, "active"];
 
  if (req.file) {
    query += ", image=?";
    params.push(req.file.filename);
  }

  query += " WHERE id=?";
  params.push(package_id);

  db.query(query, params, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error updating package" });
    }

    db.query(
      "DELETE FROM package_services WHERE package_id=?",
      [package_id],
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Failed to remove old services" });
        }

        if (services.length === 0) {
          return res.json({ message: "Package updated successfully" });
        }

        const values = services.map((service_id) => [package_id, service_id]);

        db.query(
          "INSERT INTO package_services (package_id, service_id) VALUES ?",
          [values],
          (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: "Failed to add new services" });
            }

            res.json({ message: "Package updated successfully" });
          }
        );
      }
    );
  });
});
 
app.get("/admin/packages", verifyAdmin, (req, res) => {
  db.query(
    `SELECT p.id, p.name, p.description, p.price, p.duration, p.status, p.image,
      JSON_ARRAYAGG(
        CASE
          WHEN s.id IS NOT NULL
          THEN JSON_OBJECT('id', s.id, 'name', s.name, 'price', s.price)
        END
      ) AS services
     FROM packages p
     LEFT JOIN package_services ps ON p.id = ps.package_id
     LEFT JOIN services s ON ps.service_id = s.id
     GROUP BY p.id`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });

      results.forEach(pkg => {
        if (typeof pkg.services === "string") {
          pkg.services = JSON.parse(pkg.services).filter(s => s);
        }
      });

      res.json(results);
    }
  );
});
 
app.get("/packages", (req, res) => {
  db.query(
    `SELECT p.id, p.name, p.description, p.price, p.duration, p.image,
      JSON_ARRAYAGG(
  CASE
    WHEN s.id IS NOT NULL
    THEN JSON_OBJECT('id', s.id, 'name', s.name, 'price', s.price)
  END
) AS services
     FROM packages p
     LEFT JOIN package_services ps ON p.id = ps.package_id
     LEFT JOIN services s ON ps.service_id = s.id
     WHERE p.status='active'
     GROUP BY p.id`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });
      res.json(results);
    }
  );
});

app.get("/packages/:id", (req, res) => {
  const packageId = req.params.id;

  db.query(
    `SELECT p.id, p.name, p.description, p.price, p.duration, p.image,
      JSON_ARRAYAGG(
        CASE
          WHEN s.id IS NOT NULL THEN JSON_OBJECT('id', s.id, 'name', s.name, 'price', s.price, 'image', s.image, 'description', s.description)
        END
      ) AS services
    FROM packages p
    LEFT JOIN package_services ps ON p.id = ps.package_id
    LEFT JOIN services s ON ps.service_id = s.id
    WHERE p.id = ? AND p.status='active'
    GROUP BY p.id`,
    [packageId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });
      if (results.length === 0) return res.status(404).json({ message: "Package not found" });
 
      if (typeof results[0].services === "string") {
        results[0].services = JSON.parse(results[0].services);
      }

      res.json(results[0]);
    }
  );
});


app.put("/admin/packages/:id", verifyAdmin, (req, res) => {
  const { name, description, price, duration, status, service_ids } = req.body;
  const package_id = req.params.id;

  db.query(
    "UPDATE packages SET name=?, description=?, price=?, duration=?, status=? WHERE id=?",
    [name, description || null, price, duration, status, package_id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
 
      db.query(
        "DELETE FROM package_services WHERE package_id=?",
        [package_id],
        (err) => {
          if (err) return res.status(500).json({ message: "Failed to remove old services" });

          const values = service_ids.map((service_id) => [package_id, service_id]);
          db.query(
            "INSERT INTO package_services (package_id, service_id) VALUES ?",
            [values],
            (err) => {
              if (err) return res.status(500).json({ message: "Failed to add new services" });
              res.json({ message: "Package updated successfully" });
            }
          );
        }
      );
    }
  );
});
 
app.get("/admin/packages/:id", verifyAdmin, (req, res) => {
  const packageId = req.params.id;

  db.query(
    `SELECT p.id, p.name, p.description, p.price, p.duration, p.status,
            JSON_ARRAYAGG(JSON_OBJECT('id', s.id, 'name', s.name, 'price', s.price)) AS services
     FROM packages p
     LEFT JOIN package_services ps ON p.id = ps.package_id
     LEFT JOIN services s ON ps.service_id = s.id
     WHERE p.id = ?
     GROUP BY p.id`,
    [packageId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });
      if (!results.length) return res.status(404).json({ message: "Package not found" });
 
      const pkg = results[0];
      if (pkg.services) {
  if (typeof pkg.services === "string") {
    pkg.services = JSON.parse(pkg.services);
  }
  pkg.services = pkg.services.filter(s => s && s.id);
} else {
  pkg.services = [];
}
      res.json(pkg);
    }
  );
});

app.delete("/admin/packages/:id", verifyAdmin, (req, res) => {
  const package_id = req.params.id;

  db.query("DELETE FROM package_services WHERE package_id=?", [package_id], (err) => {
    if (err) return res.status(500).json({ message: "Failed to delete package services" });

    db.query("DELETE FROM packages WHERE id=?", [package_id], (err) => {
      if (err) return res.status(500).json({ message: "Failed to delete package" });
      res.json({ message: "Package deleted successfully" });
    });
  });
});

app.put("/packages/:id/:status", verifyAdmin, (req, res) => {
  const package_id = req.params.id;
  const status = req.params.status;

  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  db.query(
    "UPDATE packages SET status=? WHERE id=?",
    [status, package_id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });

      res.json({ message: `Package ${status} successfully` });
    }
  );
});


app.post("/bookings/package", verifyUser, (req, res) => {
  const { package_id, booking_date, booking_time, notes, location_type, address } = req.body;
  const user_id = req.user.id;

  if (!package_id || !booking_date || !booking_time || !location_type) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  db.query(
    `SELECT service_id FROM package_services WHERE package_id=?`,
    [package_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (!results.length) return res.status(400).json({ message: "Package has no services" });

      const service_ids = results.map(r => r.service_id);
      const values = service_ids.map(sid => [
        user_id,
        sid,
        booking_date,
        booking_time,
        notes || null,
        "upcoming",
        location_type,
        address || null
      ]);

      db.query(
        `INSERT INTO bookings 
         (user_id, service_id, booking_date, booking_time, notes, status, location_type, address)
         VALUES ?`,
        [values],
        (err) => {
          if (err) return res.status(500).json({ message: "Booking failed", error: err });
          res.json({ message: "Package booked successfully", service_count: service_ids.length });
        }
      );
    }
  );
});



  app.get("/admin/stats", verifyAdmin, async (req, res) => {
  try {
    const [users] = await db.promise().query(`SELECT COUNT(id) AS totalUsers FROM users`);
    const [bookings] = await db.promise().query(`SELECT COUNT(id) AS totalBookings FROM bookings`);
    const [services] = await db.promise().query(`SELECT COUNT(id) AS totalServices FROM services`);
    const [packages] = await db.promise().query(`SELECT COUNT(id) AS totalPackages FROM packages`);

    res.json({
      totalUsers: users[0]?.totalUsers || 0,
      totalBookings: bookings[0]?.totalBookings || 0,
      totalServices: services[0]?.totalServices || 0,
      totalPackages: packages[0]?.totalPackages || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

app.get("/admin/monthly-stats", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT
        DATE_FORMAT(b.booking_date, '%Y-%m') AS month,
        COUNT(b.id) AS bookings,
        COALESCE(SUM(COALESCE(s.price, 0) + COALESCE(p.price, 0)), 0) AS revenue
      FROM bookings b
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN packages p ON b.package_id = p.id
      GROUP BY YEAR(b.booking_date), MONTH(b.booking_date)
      ORDER BY YEAR(b.booking_date), MONTH(b.booking_date)
    `);

    if (!rows || rows.length === 0) {
      return res.json([]);
    }

    res.json(rows);
  } catch (err) {
    console.error("Error fetching monthly stats:", err);
    res.status(500).json({
      message: "Failed to fetch monthly stats",
      error: err?.message || "unknown",
      stack: err?.stack?.split('\n').slice(0, 3),
    });
  }
});

app.get("/admin/service-categories", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT category AS name, COUNT(id) AS value
      FROM services
      GROUP BY category
    `);

    if (!rows || rows.length === 0) {
      return res.json([]);
    }
    res.json(rows);
  } catch (err) {
    console.error("Service category error:", err);
    res.status(500).json({ message: "Error fetching service categories" });
  }
});

app.get("/admin/ai-sentiment", verifyAdmin, async (req, res) => {
  try {
    const [feedbackRows] = await db.promise().query(
      `SELECT feedback_text FROM feedback WHERE feedback_text IS NOT NULL AND TRIM(feedback_text) <> ''`
    );

    const counts = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    feedbackRows.forEach((row) => {
      const feedbackText = String(row.feedback_text || "").trim();
      if (!feedbackText) return;

      try {
        const sentiment = vader.SentimentIntensityAnalyzer.polarity_scores(feedbackText);
        const compound = sentiment.compound;

        if (compound >= 0.05) {
          counts.positive += 1;
        } else if (compound <= -0.05) {
          counts.negative += 1;
        } else {
          counts.neutral += 1;
        }
      } catch (error) {
        console.error("Error analyzing sentiment for text:", feedbackText, error);
        // Default to neutral on error
        counts.neutral += 1;
      }
    });

    res.json([
      { sentiment: "positive", count: counts.positive },
      { sentiment: "neutral", count: counts.neutral },
      { sentiment: "negative", count: counts.negative },
    ]);
  } catch (err) {
    console.error("AI sentiment error:", err);
    res.status(500).json({ message: "Error fetching sentiment data", error: err.message });
  }
});

// Admin list detailed feedback with sentiment for AI sentiment page
app.get("/admin/ai-sentiment-details", verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    let whereClause = "WHERE f.feedback_text IS NOT NULL AND TRIM(f.feedback_text) <> ''";
    const params = [];

    if (search) {
      whereClause += " AND (u.fullname LIKE ? OR f.feedback_text LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    const [countResult] = await db.promise().query(`SELECT COUNT(*) AS total FROM feedback f LEFT JOIN users u ON f.user_id = u.id ${whereClause}`, params);
    const total = countResult[0]?.total || 0;

    const [feedbackRows] = await db.promise().query(
      `SELECT f.id, f.booking_id, f.user_id, u.fullname AS customer, f.feedback_text AS feedback, f.rating, f.created_at
       FROM feedback f
       LEFT JOIN users u ON f.user_id = u.id
       ${whereClause}
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const details = feedbackRows.map((entry) => {
      const text = (entry.feedback || "").trim();
      let compound = 0;
      let label = "neutral";
      try {
        const sentimentScores = vader.SentimentIntensityAnalyzer.polarity_scores(text);
        compound = sentimentScores.compound;
        if (compound >= 0.05) label = "positive";
        else if (compound <= -0.05) label = "negative";
      } catch (e) {
        console.error("Sentiment analysis error for text:", text, e);
        // Keep default neutral
      }

      return {
        id: entry.id,
        customer: entry.customer || "Unknown",
        feedback: text,
        rating: entry.rating,
        createdAt: entry.created_at,
        sentiment: label,
        sentimentScore: compound,
      };
    });

    res.json({
      data: details,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error("AI sentiment details error:", err);
    res.status(500).json({ message: "Error fetching sentiment details", error: err.message });
  }
});

app.post("/payment", (req, res) => {
  const { bookingId, amount, method, status } = req.body;

  const query = `
    INSERT INTO payments (booking_id, amount, method, status)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [bookingId, amount, method, status], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "DB insert failed" });
    }

    if (status === "success") {
      db.query(
        "UPDATE bookings SET status='confirmed' WHERE id=?",
        [bookingId],
        (err2) => {
          if (err2) {
            console.log(err2);
            return res.status(500).json({ message: "Booking update failed" });
          }

          return res.json({ success: true });
        }
      );
    } else {
      return res.json({ success: false });
    }
  });
});


app.patch("/bookings/confirm", verifyUser, (req, res) => {
  const { bookingIds } = req.body; 
  const user_id = req.user.id;

  console.log("Confirm request - user_id:", user_id, "bookingIds:", bookingIds);

  if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
    return res.status(400).json({ message: "No booking IDs provided" });
  }
  
  // First check if bookings exist
  db.query(
    `SELECT id, status, user_id FROM bookings WHERE id IN (?) AND user_id = ?`,
    [bookingIds, user_id],
    (err, existingBookings) => {
      if (err) {
        console.error("Check bookings error:", err);
        return res.status(500).json({ message: "DB error checking bookings", error: err.message });
      }

      console.log("Found bookings:", existingBookings);

      if (existingBookings.length === 0) {
        return res.status(400).json({ 
          message: "No bookings found for these IDs and user",
          requestedIds: bookingIds,
          user_id: user_id
        });
      }

      // Now update to confirmed
      db.query(
        `UPDATE bookings 
         SET status = 'confirmed' 
         WHERE id IN (?) AND user_id = ? AND status = 'upcoming'`,
        [bookingIds, user_id],
        (err, result) => {
          if (err) {
            console.error("DB Error updating:", err);
            return res.status(500).json({ message: "DB error updating bookings", error: err.message });
          }

          console.log("Update result:", result);

          if (result.affectedRows === 0) {
            return res.status(400).json({ 
              message: "No bookings were updated. They may not exist, user mismatch, or already confirmed.",
              existingBookings: existingBookings
            });
          }

          res.json({
            message: "Bookings confirmed successfully",
            confirmedCount: result.affectedRows,
            bookingIds: bookingIds,
          });
        }
      );
    }
  );
});

// Payments routes
const paymentsRouter = require("./payments");
app.use("/payments", paymentsRouter);

app.post("/payments/save-transaction", async (req, res) => {
  const { refId, txnId, amount, bookingIds, status, paymentMethod } = req.body;

  try {
    const [exists] = await db.promise().query(
      "SELECT id FROM payments WHERE transaction_id = ?",
      [txnId]
    );

    if (exists.length > 0) {
      return res.json({ message: "Transaction already saved" });
    }

    await db.promise().query(
      "INSERT INTO payments (reference_id, transaction_id, amount, status, payment_method, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [refId, txnId, amount, status, paymentMethod]
    );

    res.json({ message: "Transaction saved successfully" });
  } catch (err) {
    console.error("Error saving transaction:", err);
    res.status(500).json({ message: "Failed to save transaction" });
  }
});

// API endpoint for sentiment analysis
app.post("/api/sentiment", (req, res) => {
  const { text } = req.body;  // Get text from the request body
  
  if (!text) {
    return res.status(400).json({ message: "Text is required" });
  }

  const result = analyzeSentiment(text);  // Analyze the sentiment of the text
  res.json(result);  // Return the sentiment result
});

 
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Socket.io ready at http://localhost:${port}`);
});



