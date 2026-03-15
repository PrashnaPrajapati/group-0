require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const http = require('http');
const socketIo = require('socket.io');
const db = require("./db");

const app = express();
const port = 5001;
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",  // Allow requests from any origin
    methods: ["GET", "POST"]
  }
});


let users = {};
let admin = {};

const fs = require("fs");
const uploadDir = "uploads";

// Create uploads folder if it doesn't exist
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

  // Validate password strength
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

        // Check if new password matches the old password
        const isSamePassword = await bcrypt.compare(newPassword, currentHashedPassword);
        if (isSamePassword) {
          return res.status(400).json({ message: "New password cannot be the same as the previous password" });
        }

        // Hash new password
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

// On client connection (Socket.IO)
io.on("connection", (socket) => {
  console.log("A user connected: " + socket.id);

  // Register user or admin when they connect
  socket.on("register_user", (userId) => {
    users[userId] = socket.id;
    console.log(`User registered: ${userId}`);
  });

  socket.on("register_admin", (adminId) => {
    admin[adminId] = socket.id;
    console.log(`Admin registered: ${adminId}`);
  });

  // Handle incoming messages from users or admins
  socket.on("send_message", (data) => {
    const { senderId, receiverId, senderRole, message } = data;
    
    console.log(`Message from ${senderRole} ${senderId} to ${receiverId}: ${message}`);

    // Check if the receiver is a user or admin, then emit to the corresponding socket ID
    if (senderRole === "users") {
      io.to(admin[receiverId]).emit("receive_message", message);
    } else if (senderRole === "admin") {
      io.to(users[receiverId]).emit("receive_message", message);
    }
  });

  // Handle disconnecting users or admins
  socket.on("disconnect", () => {
    for (let userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        break;
      }
    }
    for (let adminId in admin) {
      if (admin[adminId] === socket.id) {
        delete admin[adminId];
        break;
      }
    }
    console.log("A user or admin disconnected");
  });
});

// Fetch receiver's socket ID based on their role (either 'user' or 'admin')
const getReceiverByRole = (receiverId, senderRole) => {
  return new Promise((resolve, reject) => {
    const role = senderRole === "users" ? "admin" : "users"; // Get the opposite role
    const query = "SELECT id, socketId FROM users WHERE id = ? AND role = ? LIMIT 1"; 
    db.query(query, [receiverId, role], (err, result) => {
      if (err) return reject(err);
      if (result.length > 0) {
        resolve(result[0]);  // Return the receiver's socketId
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

// Public services (users see ONLY active)
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


// Add new service
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

// Update service
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
    req.user = decoded; // user info available in req.user
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"), // folder for uploaded images
  filename: (req, file, cb) => cb(null, `user-${req.user.id}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// Get user profile
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

// Update profile
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

// Change password
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

// Endpoint to upload/change profile photo
// Profile photo upload
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

// Create a booking
// Create a booking (supports multiple services)
app.post("/bookings", verifyUser, (req, res) => {
  const { service_ids, booking_date, booking_time, notes, location_type, address } = req.body;
  const user_id = req.user.id;
  
  // Log the request body for debugging
  console.log("Booking Request Body:", req.body);

  if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
    return res.status(400).json({ message: "At least one service is required" });
  }
  if (!booking_date || !booking_time) {
    return res.status(400).json({ message: "Date and time are required" });
  }
  if (!location_type || (location_type === "home" && !address)) {
    return res.status(400).json({ message: "Location and address are required" });
  }

  // Build values for bulk insert
  const values = service_ids.map((id) => [
    user_id,
    id,
    booking_date,
    booking_time,
    notes || null,
    "upcoming", // status
    location_type,
    address || null
  ]);

  console.log("Booking Insert Values:", values); // debug log

  db.query(
    `INSERT INTO bookings 
     (user_id, service_id, booking_date, booking_time, notes, status, location_type, address)
     VALUES ?`,
    [values],
    (err) => {
      if (err) {
        console.error("DB Error:", err); // log the error message
        return res.status(500).json({ message: "DB error", error: err });
      }
      res.json({ message: "Booking successful", booking_count: service_ids.length });
    }
  );
});
 
// Get user's bookings
app.get("/bookings/my", verifyUser, (req, res) => {
  const user_id = req.user.id;

  db.query(
    `SELECT 
      b.id,
      s.name AS service,
      b.booking_date,
      b.booking_time,
      b.notes,
      b.status,
      s.price 
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    WHERE b.user_id = ? AND (b.status = 'upcoming' OR b.status = 'completed' OR b.status = 'cancelled')
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
    `SELECT b.id, u.fullName AS user, s.name AS service, b.booking_date, b.booking_time, b.notes, b.status, s.price 
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN services s ON b.service_id = s.id`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });

      console.log("API Bookings Data:", results); // Log results here for debugging
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


// PUT /bookings/:id/reschedule
// PUT /bookings/:id/reschedule
// backend/routes/bookings.js (or wherever your booking routes are)
app.put("/bookings/:id/reschedule", (req, res) => {
  const bookingId = req.params.id;
  let { booking_date, booking_time, location_type, reason, address } = req.body;

  // First, fetch the booking
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

      // Use existing values if not provided
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
  const bookingId = req.params.id;  // Get booking ID from URL params
  const { status } = req.body;      // Get the new status from the request body

  // Check if the booking exists
  db.query('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, rows) => {
    if (err) {
      console.error('Error fetching booking:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update the booking status
    db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId], (updateErr, result) => {
      if (updateErr) {
        console.error('Error updating booking status:', updateErr);
        return res.status(500).json({ message: 'Server error' });
      }

      return res.status(200).json({ message: 'Booking status updated successfully' });
    });
  });
});

// Get booked time slots for a specific date (duration-aware)
app.get("/bookings/booked-slots", (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  // Query all upcoming bookings for the selected date with their durations
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
        // Booking start time
        let [hour, minute] = booking.booking_time.split(":").map(Number);
        // Duration in minutes
        const duration = Number(String(booking.service_duration).replace(/\D/g, ""));
        const slotCount = Math.ceil(duration / 60); // number of 1-hour slots to block

        for (let i = 0; i < slotCount; i++) {
          const h = hour + i;
          const slotStr = `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
          blockedSlots.push(slotStr);
        }
      });

      // Remove duplicates if any
      const uniqueBlockedSlots = [...new Set(blockedSlots)];

      res.json(uniqueBlockedSlots); // e.g., ["09:00", "10:00", "15:00"]
    }
  );
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


// Add new package with multiple services
app.post("/admin/packages", verifyAdmin, packageUpload.single("image"), (req, res) => {
  const { name, description, price, duration, status = "active", service_ids } = req.body;
  const image = req.file ? req.file.filename : null;

  let servicesArray;
  try {
    servicesArray = JSON.parse(service_ids); // since frontend sends JSON string
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

// Admin: Edit Package - PUT
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


  // Build update query
  let query = "UPDATE packages SET name=?, description=?, price=?, duration=?, status=?";
  let params = [name, description || null, price, duration, "active"];

  // If image uploaded
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

// Admin: get all packages with included services
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

// Public packages: only active
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

      // 'results[0].services' may come as a string, parse it safely
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

      // Update services: delete old first, then insert new
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



// Admin: get package by ID with included services
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

      // JSON_ARRAYAGG returns null if no services, so make it an empty array
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


  // Example: Get some statistics from your database
  app.get("/admin/stats", verifyAdmin, async (req, res) => {
  try {
    const [userCountResult] = await db.promise().query('SELECT COUNT(id) AS totalUsers FROM users');
    const totalUsers = userCountResult[0]?.totalUsers || 0;

    const [bookingCountResult] = await db.promise().query('SELECT COUNT(id) AS totalBookings FROM bookings');
    const totalBookings = bookingCountResult[0]?.totalBookings || 0;

    const [serviceCountResult] = await db.promise().query('SELECT COUNT(id) AS totalServices FROM services');
    const totalServices = serviceCountResult[0]?.totalServices || 0;

    const [packageCountResult] = await db.promise().query('SELECT COUNT(id) AS totalPackages FROM packages');
    const totalPackages = packageCountResult[0]?.totalPackages || 0;

    res.json({
      totalUsers,
      totalBookings,
      totalServices,
      totalPackages
    });
  } catch (err) {
    console.error("Error fetching stats", err);
    res.status(500).json({ message: "Error fetching stats", error: err });
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


