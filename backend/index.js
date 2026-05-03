require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const http = require('http'); 
const socketIo = require('socket.io');
const vader = require('vader-sentiment');
const db = require("./db");
const { initializeChat } = require("./chatHandler");
const NotificationService = require("./notificationService");
const NotificationManager = require("./notificationManager");
const authRoutes = require("./routes/authRoutes");
const User = require("./models/userModel");


const app = express();
const port = 5001;
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",  
    methods: ["GET", "POST"]
  }
}); 

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
app.use(authRoutes);

app.get("/", (req, res) => {
  res.send("Chat server is running!");
});
 
// Initialize notification service (needed by chat to create notifications)
const notificationService = new NotificationService(io);

// Initialize chat (pass notification service for chat-message notifications)
initializeChat(io, notificationService);

const slotHolds = new Map();
const SLOT_HOLD_MS = 2 * 60 * 1000;

const getSlotHoldKey = (date, slot) => `${date}|${slot}`;

const releaseSlotHold = (key) => {
  const hold = slotHolds.get(key);
  if (!hold) return;

  clearTimeout(hold.timeoutId);
  slotHolds.delete(key);
  io.to(`booking_date_${hold.date}`).emit("booking_slot_released", {
    date: hold.date,
    slot: hold.slot,
  });
};

const getBlockedSlotsForDate = (date, includeHolds = true) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT b.booking_time, COALESCE(s.duration, p.duration, b.custom_service_duration) AS duration
       FROM bookings b
       LEFT JOIN services s ON b.service_id = s.id
       LEFT JOIN packages p ON b.package_id = p.id
       WHERE b.booking_date = ? AND b.status <> 'cancelled'`,
      [date],
      (err, results) => {
        if (err) return reject(err);

        const blockedSlots = [];

        results.forEach((booking) => {
          let [hour, minute] = booking.booking_time.split(":").map(Number);
          const duration = Number(String(booking.duration || 60).replace(/\D/g, "")) || 60;
          const slotCount = Math.ceil(duration / 60);

          for (let i = 0; i < slotCount; i++) {
            const h = hour + i;
            const slotStr = `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
            blockedSlots.push(slotStr);
          }
        });

        const heldSlots = includeHolds
          ? Array.from(slotHolds.values())
              .filter((hold) => hold.date === date)
              .map((hold) => hold.slot)
          : [];

        resolve([...new Set([...blockedSlots, ...heldSlots])]);
      }
    );
  });
};

const ensureSlotAvailable = async (date, slot) => {
  const blockedSlots = await getBlockedSlotsForDate(date, false);
  return !blockedSlots.includes(slot);
};

const RESCHEDULE_CUTOFF_MS = 12 * 60 * 60 * 1000;
const CANCELLATION_CHARGE_RATE = 0.15;
const RESCHEDULE_CUTOFF_MESSAGE =
  "Bookings can only be rescheduled at least 12 hours before the appointment.";

const formatDateForSlot = (value) => {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(value || "").split("T")[0];
};

const getBookingDateTime = (date, time) => {
  const normalizedDate = formatDateForSlot(date);
  const normalizedTime = String(time || "").slice(0, 5);
  const bookingDateTime = new Date(`${normalizedDate}T${normalizedTime}:00`);
  return Number.isNaN(bookingDateTime.getTime()) ? null : bookingDateTime;
};

const isBeforeRescheduleCutoff = (date, time) => {
  const bookingDateTime = getBookingDateTime(date, time);
  return Boolean(bookingDateTime && bookingDateTime.getTime() - Date.now() < RESCHEDULE_CUTOFF_MS);
};

const broadcastBookedSlot = (date, slot) => {
  const key = getSlotHoldKey(date, slot);
  releaseSlotHold(key);
  io.to(`booking_date_${date}`).emit("booking_slot_booked", { date, slot });
};

io.on("connection", (socket) => {
  socket.on("join_booking_date", ({ date }) => {
    if (date) socket.join(`booking_date_${date}`);
  });

  socket.on("leave_booking_date", ({ date }) => {
    if (date) socket.leave(`booking_date_${date}`);
  });

  socket.on("hold_booking_slot", ({ date, slot }) => {
    if (!date || !slot) return;

    const key = getSlotHoldKey(date, slot);
    const existingHold = slotHolds.get(key);

    if (existingHold && existingHold.socketId !== socket.id) {
      socket.emit("booking_slot_hold_failed", { date, slot });
      return;
    }

    if (existingHold) {
      clearTimeout(existingHold.timeoutId);
    }

    const timeoutId = setTimeout(() => releaseSlotHold(key), SLOT_HOLD_MS);
    slotHolds.set(key, { date, slot, socketId: socket.id, timeoutId });

    socket.to(`booking_date_${date}`).emit("booking_slot_held", {
      date,
      slot,
    });
  });

  socket.on("release_booking_slot", ({ date, slot }) => {
    if (!date || !slot) return;

    const key = getSlotHoldKey(date, slot);
    const hold = slotHolds.get(key);
    if (hold?.socketId === socket.id) {
      releaseSlotHold(key);
    }
  });

  socket.on("disconnect", () => {
    Array.from(slotHolds.entries()).forEach(([key, hold]) => {
      if (hold.socketId === socket.id) {
        releaseSlotHold(key);
      }
    });
  });
}); 
 
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
  db.query(
    `SELECT
      id,
      fullName,
      phone,
      email,
      gender,
      created_at,
      role,
      blocked,
      blockedReason,
      isEmailVerified,
      failedLoginAttempts,
      lockUntil
    FROM users
    ORDER BY created_at DESC, id DESC`,
    (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(results);
    }
  );
});

app.delete("/admin/users/unverified-expired", verifyAdmin, async (req, res) => {
  try {
    const deletedCount = await User.deleteExpiredUnverifiedUsers();

    return res.json({
      message: "Expired unverified accounts cleaned up",
      deletedCount,
    });
  } catch (err) {
    console.error("Error cleaning expired unverified users:", err);
    return res.status(500).json({ message: "Database error" });
  }
});

app.put("/admin/users/:id/role", verifyAdmin, (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;
  const allowedRoles = ["admin", "users"];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  db.query(
    "UPDATE users SET role = ? WHERE id = ?",
    [role, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User role updated" });
    }
  );
});

const handleBlockUser = (userId, reason, res) => {
  if (!reason || !reason.toString().trim()) {
    return res.status(400).json({ message: "Block reason is required." });
  }

  db.query(
    "UPDATE users SET blocked = TRUE, blockedReason = ? WHERE id = ?",
    [reason.trim(), userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User blocked successfully" });
    }
  );
};

const handleUnblockUser = (userId, res) => {
  db.query(
    "UPDATE users SET blocked = FALSE, blockedReason = NULL WHERE id = ?",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User unblocked successfully" });
    }
  );
};

app.put("/admin/users/:id/block", verifyAdmin, (req, res) => {
  handleBlockUser(req.params.id, req.body.reason, res);
});

app.post("/admin/users/:id/block", verifyAdmin, (req, res) => {
  handleBlockUser(req.params.id, req.body.reason, res);
});

app.put("/admin/users/:id/unblock", verifyAdmin, (req, res) => {
  handleUnblockUser(req.params.id, res);
});

app.post("/admin/users/:id/unblock", verifyAdmin, (req, res) => {
  handleUnblockUser(req.params.id, res);
});

app.delete("/admin/users/:id", verifyAdmin, (req, res) => {
  const userId = req.params.id;

  db.query("SELECT role FROM users WHERE id = ?", [userId], (findErr, rows) => {
    if (findErr) return res.status(500).json({ message: "Database error" });
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (rows[0].role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be deleted" });
    }

    db.query("DELETE FROM users WHERE id = ?", [userId], (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted" });
    });
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
    `SELECT s.id,
            s.name,
            s.description,
            s.price,
            s.duration,
            s.image,
            s.status,
            s.created_at,
            s.gender,
            s.category,
            IFNULL(ROUND(AVG(f.rating), 1), 0) AS rating
     FROM services s
     LEFT JOIN bookings b ON b.service_id = s.id
     LEFT JOIN feedback f ON f.booking_id = b.id
     WHERE s.status = 'active'
     GROUP BY s.id, s.name, s.description, s.price, s.duration, s.image, s.status, s.created_at, s.gender, s.category`,
    (err, results) => {
      if (err) {
        console.error("SERVICES ERROR:", err);
        return res.status(500).json({ message: "Database error" });
      }
 
      res.json(results);
    }
  );
});
 
app.get("/services/:id", (req, res) => {
  db.query(
    `SELECT s.id,
            s.name,
            s.description,
            s.price,
            s.duration,
            s.image,
            s.status,
            s.created_at,
            s.gender,
            s.category,
            IFNULL(ROUND(AVG(f.rating), 1), 0) AS rating,
            COUNT(f.id) AS review_count
     FROM services s
     LEFT JOIN bookings b ON b.service_id = s.id
     LEFT JOIN feedback f ON f.booking_id = b.id
     WHERE s.id = ? AND s.status = 'active'
     GROUP BY s.id, s.name, s.description, s.price, s.duration, s.image, s.status, s.created_at, s.gender, s.category`,
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (!results || results.length === 0)
        return res.status(404).json({ message: "Service not found" });
      res.json(results[0]);
    }
  );
});

app.get("/services/:id/reviews", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT u.fullname AS customer, f.rating, f.feedback_text AS review, f.created_at
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       JOIN bookings b ON f.booking_id = b.id
       WHERE b.service_id = ?
       ORDER BY f.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
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

app.put("/profile/change-password", verifyUser, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both passwords required" });

  db.query("SELECT password FROM users WHERE id=?", [userId], async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (results.length === 0) return res.status(404).json({ message: "User not found" });

    if (!results[0].password) {
      return res.status(400).json({
        message: "This account uses Google sign-in. Use forgot password to create a password first.",
      });
    }

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
  const { service_ids, package_id, booking_date, booking_time, notes, location_type, address, payment_method } = req.body;
  const user_id = req.user.id;
  const userId = req.user.id;
  const initialStatus = payment_method === "esewa" ? "pending" : "upcoming";
 
  if (!booking_date || !booking_time) {
    return res.status(400).json({ message: "Date and time are required" });
  }

  const [year, month, day] = booking_date.split("-").map(Number);
  const bookingDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) {
    return res.status(400).json({ message: "Booking date must be today or in the future" });
  }

  if (!location_type || (location_type === "home" && !address)) {
    return res.status(400).json({ message: "Location and address are required" });
  }
 
  if ((!service_ids || service_ids.length === 0) && !package_id) {
    return res.status(400).json({ message: "Select at least one service or a package" });
  }

  const normalizedServiceIds = Array.isArray(service_ids)
    ? service_ids.map((id) => Number(id)).filter(Boolean)
    : [];

  ensureSlotAvailable(booking_date, booking_time)
    .then((isAvailable) => {
      if (!isAvailable) {
        return res.status(409).json({ message: "This time slot is already booked" });
      }

      continueBooking();
    })
    .catch((err) => {
      console.error("Slot availability error:", err);
      return res.status(500).json({ message: "DB error", error: err.message });
    });

  function continueBooking() {
 
  if (package_id) {
    db.query(
      "SELECT id FROM bookings WHERE user_id = ? AND package_id = ? AND status NOT IN ('cancelled', 'pending')",
      [user_id, package_id],
      (err, results) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });
        if (results.length > 0) {
          return res.status(400).json({ message: "You have already booked this package" });
        }

        db.query(
          `INSERT INTO bookings 
           (user_id, package_id, booking_date, booking_time, notes, status, location_type, address)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [user_id, package_id, booking_date, booking_time, notes || null, initialStatus, location_type, address || null],
          (err, result) => {
            if (err) return res.status(500).json({ message: "DB error", error: err });

            // Get package details for notification
            db.query(
              "SELECT name FROM packages WHERE id = ?",
              [package_id],
              async (err, packageResults) => {
                if (!err && packageResults.length > 0) {
                  try {
                    await notificationService.notifyNewBooking({
                      userId,
                      bookingId: result.insertId,
                      serviceName: null,
                      packageName: packageResults[0].name,
                      bookingDate,
                      bookingTime
                    });
                  } catch (notificationError) {
                    console.error("Error sending booking notification:", notificationError);
                  }
                }

                broadcastBookedSlot(booking_date, booking_time);
                return res.json({
                  message: "Package booking successful",
                  bookingId: result.insertId,
                });
              }
            );
          }
        );
      }
    );
    return;
  }

  if (normalizedServiceIds.length > 1) {
    db.query(
      `SELECT id, name, price, duration
       FROM services
       WHERE id IN (?) AND status = 'active'`,
      [normalizedServiceIds],
      async (err, serviceRows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });
        if (!serviceRows || serviceRows.length !== normalizedServiceIds.length) {
          return res.status(400).json({ message: "One or more selected services are unavailable" });
        }

        const orderedServices = normalizedServiceIds
          .map((id) => serviceRows.find((service) => Number(service.id) === id))
          .filter(Boolean);
        const customServiceNames = orderedServices.map((service) => service.name).join(", ");
        const customServicePrice = orderedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
        const customServiceDuration = orderedServices.reduce(
          (sum, service) => sum + (Number(String(service.duration || "").replace(/\D/g, "")) || 0),
          0
        );

        db.query(
          `INSERT INTO bookings
           (user_id, booking_date, booking_time, notes, status, location_type, address,
            custom_service_ids, custom_service_names, custom_service_price, custom_service_duration)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user_id,
            booking_date,
            booking_time,
            notes || null,
            initialStatus,
            location_type,
            address || null,
            JSON.stringify(normalizedServiceIds),
            customServiceNames,
            customServicePrice,
            customServiceDuration,
          ],
          async (insertErr, result) => {
            if (insertErr) return res.status(500).json({ message: "DB error", error: insertErr });

            try {
              await notificationService.notifyNewBooking({
                userId,
                bookingId: result.insertId,
                serviceName: customServiceNames,
                packageName: null,
                bookingDate,
                bookingTime,
              });
            } catch (notificationError) {
              console.error("Error sending custom booking notification:", notificationError);
            }

            broadcastBookedSlot(booking_date, booking_time);
            return res.json({
              message: "Custom booking successful",
              bookingId: result.insertId,
            });
          }
        );
      }
    );
    return;
  }
 
  const insertedBookingIds = [];

  let checkedCount = 0;
  const duplicates = [];

  normalizedServiceIds.forEach((service_id) => {
    db.query(
      "SELECT id FROM bookings WHERE user_id = ? AND service_id = ? AND status NOT IN ('cancelled', 'pending')",
      [user_id, service_id],
      (err, results) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });
        if (results.length > 0) duplicates.push(service_id);
        checkedCount++;
        if (checkedCount === normalizedServiceIds.length) {
          if (duplicates.length > 0) {
            return res.status(400).json({ message: "You have already booked one or more of these services" });
          }

        const insertNext = (index) => {
          if (index >= normalizedServiceIds.length) {
            // Send notifications for all booked services
            Promise.all(
              insertedBookingIds.map(async (bookingId, idx) => {
                try {
                  const serviceId = normalizedServiceIds[idx];
                  const serviceResult = await new Promise((resolve, reject) => {
                    db.query("SELECT name FROM services WHERE id = ?", [serviceId], (err, results) => {
                      if (err) reject(err);
                      else resolve(results[0]);
                    });
                  });

                  await notificationService.notifyNewBooking({
                    userId,
                    bookingId,
                    serviceName: serviceResult.name,
                    packageName: null,
                    bookingDate,
                    bookingTime
                  });
                } catch (error) {
                  console.error("Error sending service booking notification:", error);
                }
              })
            ).then(() => {
              broadcastBookedSlot(booking_date, booking_time);
              return res.json({
                message: "Booking successful",
                bookingIds: insertedBookingIds,
              });
            }).catch((error) => {
              console.error("Error sending notifications:", error);
              broadcastBookedSlot(booking_date, booking_time);
              return res.json({
                message: "Booking successful",
                bookingIds: insertedBookingIds,
              });
            });
            return;
          }

          const service_id = normalizedServiceIds[index];

          db.query(
            `INSERT INTO bookings 
             (user_id, service_id, booking_date, booking_time, notes, status, location_type, address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, service_id, booking_date, booking_time, notes || null, initialStatus, location_type, address || null],
            (err, result) => {
              if (err) return res.status(500).json({ message: "DB error", error: err });

              insertedBookingIds.push(result.insertId);
              insertNext(index + 1);
            }
          );
        };

        insertNext(0);
      }
    });
  });
  }
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
      b.feedback_submitted,
      b.address,
      b.location_type,
      b.service_id,
      b.package_id,
      b.custom_service_ids,
      b.custom_service_names,
      b.custom_service_price,
      b.custom_service_duration,

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
            b.custom_service_names,
            b.custom_service_price,
            b.custom_service_duration,
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
      res.json(results);
    }
  );
});

app.put("/bookings/:id/cancel", verifyUser, (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user.id;

  // First get booking details for notification
  db.query(
    `SELECT b.*, s.name AS service_name, p.name AS package_name,
            COALESCE(s.price, p.price, b.custom_service_price, 0) AS booking_amount
     FROM bookings b
     LEFT JOIN services s ON b.service_id = s.id
     LEFT JOIN packages p ON b.package_id = p.id
     WHERE b.id = ? AND b.user_id = ?`,
    [bookingId, userId],
    (err, bookingResults) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (bookingResults.length === 0) return res.status(404).json({ message: "Booking not found" });

      const booking = bookingResults[0];
      const cancellationAmount = Number(booking.booking_amount) || 0;
      const cancellationCharge = Number((cancellationAmount * CANCELLATION_CHARGE_RATE).toFixed(2));
      const estimatedRefund = Number(Math.max(cancellationAmount - cancellationCharge, 0).toFixed(2));

      // Update booking status
      db.query(
        "UPDATE bookings SET status='cancelled' WHERE id=? AND user_id=?",
        [bookingId, userId],
        async (err) => {
          if (err) return res.status(500).json({ message: "DB error" });

          // Send cancellation notification
          try {
            await notificationService.notifyBookingCancellation({
              userId,
              bookingId,
              serviceName: booking.service_name || booking.custom_service_names,
              packageName: booking.package_name,
              bookingDate: booking.booking_date,
              bookingTime: booking.booking_time
            });
          } catch (notificationError) {
            console.error("Error sending cancellation notification:", notificationError);
          }

          res.json({
            message: `Booking cancelled. 15% cancellation charge deducted: Rs. ${cancellationCharge.toFixed(2)}. Estimated refund: Rs. ${estimatedRefund.toFixed(2)}.`,
            cancellationCharge,
            estimatedRefund,
          });
        }
      );
    }
  );
});

app.patch("/bookings/payment-failed", verifyUser, (req, res) => {
  const { bookingIds } = req.body;
  const userId = req.user.id;

  if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
    return res.status(400).json({ message: "No booking IDs provided" });
  }

  db.query(
    "UPDATE bookings SET status='cancelled' WHERE id IN (?) AND user_id=? AND status IN ('pending', 'upcoming')",
    [bookingIds, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({
        message: "Failed payment booking cancelled",
        cancelledCount: result.affectedRows,
      });
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

      if (isBeforeRescheduleCutoff(booking.booking_date, booking.booking_time)) {
        return res.status(400).json({ message: RESCHEDULE_CUTOFF_MESSAGE });
      }
 
      booking_date = formatDateForSlot(booking_date || booking.booking_date);
      booking_time = booking_time || booking.booking_time;
      location_type = location_type || booking.location_type || "salon";
      address = location_type === "home" ? (address || booking.address || "") : "salon";

      if (!booking_date) return res.status(400).json({ message: "Booking date is required" });

      const [year, month, day] = booking_date.split("-").map(Number);
      const newBookingDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (newBookingDate < today) {
        return res.status(400).json({ message: "Booking date must be today or in the future" });
      }

      if (!booking_time) return res.status(400).json({ message: "Booking time is required" });

      if (booking_time.length === 5) booking_time += ":00";
      const normalizedBookingTime = booking_time.slice(0, 5);
      const originalBookingDate = formatDateForSlot(booking.booking_date);
      const originalBookingTime = String(booking.booking_time).slice(0, 5);

      ensureSlotAvailable(booking_date, normalizedBookingTime)
        .then((isAvailable) => {
          const isOriginalSlot =
            booking_date === originalBookingDate && normalizedBookingTime === originalBookingTime;

          if (!isAvailable && !isOriginalSlot) {
            return res.status(409).json({ message: "Selected time slot is no longer available" });
          }

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

              if (!isOriginalSlot) {
                io.to(`booking_date_${originalBookingDate}`).emit("booking_slot_released", {
                  date: originalBookingDate,
                  slot: originalBookingTime,
                });
                broadcastBookedSlot(booking_date, normalizedBookingTime);
              }

              res.json({ message: "Booking rescheduled successfully" });
            }
          );
        })
        .catch((availabilityErr) => {
          console.error("Slot availability error:", availabilityErr);
          res.status(500).json({ message: "Could not verify slot availability" });
        });
    }
  );
});

app.put('/admin/bookings/:id/status', (req, res) => {
  const bookingId = req.params.id;
  const { status } = req.body;

  if (status !== 'completed') {
    return res.status(400).json({ message: 'Admin can only change status to completed' });
  }

  db.query('SELECT status FROM bookings WHERE id = ?', [bookingId], (err, rows) => {
    if (err) {
      console.error('Error fetching booking:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const currentStatus = rows[0].status;
    if (currentStatus !== 'upcoming') {
      return res.status(400).json({ message: 'Admin can only change upcoming bookings to completed' });
    }

    db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId], (updateErr) => {
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

  getBlockedSlotsForDate(date)
    .then((blockedSlots) => res.json(blockedSlots))
    .catch((err) => {
      console.error("DB Error:", err);
      res.status(500).json({ message: "DB error", error: err.message });
    });
}); 

app.post("/bookings/:id/review", verifyUser, async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user?.id;
  const { rating, review } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: User not logged in" });
  }

  if (!rating || !review) {
    return res.status(400).json({ message: "Rating and review are required" });
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
      return res.status(400).json({ message: "Review already submitted for this booking" });
    }

    await db.promise().query(
      "INSERT INTO feedback (booking_id, user_id, rating, feedback_text, created_at) VALUES (?, ?, ?, ?, NOW())",
      [bookingId, userId, rating, review]
    );

    await db.promise().query(
      "UPDATE bookings SET feedback_submitted = TRUE WHERE id = ?",
      [bookingId]
    );

    return res.json({ message: "Review submitted successfully" });
  } catch (err) { 
    console.error("Review route error:", err.stack || err);
    return res.status(500).json({ message: "Database error occurred", error: err.message });
  }
});

app.get("/bookings/:id/review", async (req, res) => {
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
      reviews: rows.map(f => ({
        customer: f.customer,
        rating: f.rating,
        review: f.feedback_text,
        submittedAt: f.created_at
      }))
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

app.get("/reviews", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT
         f.booking_id AS bookingId,
         u.fullname AS customer,
         f.rating,
         f.feedback_text AS review,
         f.created_at,
         COALESCE(s.name, p.name, 'Singar Glow service') AS itemName,
         CASE
           WHEN s.id IS NOT NULL THEN 'Service'
           WHEN p.id IS NOT NULL THEN 'Package'
           ELSE 'Booking'
         END AS itemType
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       JOIN bookings b ON f.booking_id = b.id
       LEFT JOIN services s ON b.service_id = s.id
       LEFT JOIN packages p ON b.package_id = p.id
       ORDER BY f.created_at DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});
 
app.get("/review", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT f.booking_id AS bookingId, u.fullname AS customer, f.rating, f.feedback_text AS review, f.created_at
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
    `SELECT p.id,
            p.name,
            p.description,
            p.price,
            p.duration,
            p.status,
            p.image,
            IFNULL(
              (SELECT ROUND(AVG(f.rating), 1)
               FROM bookings b
               JOIN feedback f ON f.booking_id = b.id
               WHERE b.package_id = p.id),
              0
            ) AS rating,
            JSON_ARRAYAGG(
              CASE
                WHEN s.id IS NOT NULL
                THEN JSON_OBJECT('id', s.id, 'name', s.name, 'price', s.price)
              END
            ) AS services
     FROM packages p
     LEFT JOIN package_services ps ON p.id = ps.package_id
     LEFT JOIN services s ON ps.service_id = s.id
     GROUP BY p.id, p.name, p.description, p.price, p.duration, p.status, p.image`,
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
    `SELECT p.id,
            p.name,
            p.description,
            p.price,
            p.duration,
            p.image,
            IFNULL(
              (SELECT ROUND(AVG(f.rating), 1)
               FROM bookings b
               JOIN feedback f ON f.booking_id = b.id
               WHERE b.package_id = p.id),
              0
            ) AS rating,
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
     GROUP BY p.id, p.name, p.description, p.price, p.duration, p.image`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });
      res.json(results);
    }
  );
});

app.get("/packages/:id/reviews", async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT u.fullname AS customer, f.rating, f.feedback_text AS review, f.created_at
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       JOIN bookings b ON f.booking_id = b.id
       WHERE b.package_id = ?
       ORDER BY f.created_at DESC`,
      [req.params.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
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
        COALESCE(SUM(IFNULL(s.price, 0) + IFNULL(p.price, 0) + IFNULL(b.custom_service_price, 0)), 0) AS revenue
      FROM bookings b
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN packages p ON b.package_id = p.id
      GROUP BY DATE_FORMAT(b.booking_date, '%Y-%m')
      ORDER BY DATE_FORMAT(b.booking_date, '%Y-%m')
    `);
 
    res.json(rows || []);
  } catch (err) {
    console.error("Error fetching monthly stats:", err);
    res.status(500).json({
      message: "Failed to fetch monthly stats",
      error: err?.message || "unknown",
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
    const [reviewRows] = await db.promise().query(
      `SELECT feedback_text FROM feedback WHERE feedback_text IS NOT NULL AND TRIM(feedback_text) <> ''`
    );

    const counts = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    reviewRows.forEach((row) => {
      const reviewText = String(row.feedback_text || "").trim();
      if (!reviewText) return;

      try {
        const sentiment = vader.SentimentIntensityAnalyzer.polarity_scores(reviewText);
        const compound = sentiment.compound;

        if (compound >= 0.05) {
          counts.positive += 1;
        } else if (compound <= -0.05) {
          counts.negative += 1;
        } else {
          counts.neutral += 1;
        }
      } catch (error) {
        console.error("Error analyzing sentiment for text:", reviewText, error); 
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

    const [reviewRows] = await db.promise().query(
      `SELECT f.id, f.booking_id, f.user_id, u.fullname AS customer, f.feedback_text AS review, f.rating, f.created_at
       FROM feedback f
       LEFT JOIN users u ON f.user_id = u.id
       ${whereClause}
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const details = reviewRows.map((entry) => {
      const text = (entry.review || "").trim();
      let compound = 0;
      let label = "neutral";
      try {
        const sentimentScores = vader.SentimentIntensityAnalyzer.polarity_scores(text);
        compound = sentimentScores.compound;
        if (compound >= 0.05) label = "positive";
        else if (compound <= -0.05) label = "negative";
      } catch (e) {
        console.error("Sentiment analysis error for text:", text, e);
      } 

      return {
        id: entry.id,
        customer: entry.customer || "Unknown",
        review: text,
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
 
      db.query(
        `UPDATE bookings 
         SET status = 'upcoming' 
         WHERE id IN (?) AND user_id = ? AND status IN ('pending', 'upcoming')`,
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
 
const paymentsRouter = require("./payments");
app.use("/payments", paymentsRouter);

app.get("/admin/payments", verifyAdmin, (req, res) => {
  const query = `
    SELECT
      p.id,
      p.reference_id,
      p.transaction_id,
      p.amount,
      p.booking_ids,
      p.status,
      p.payment_method,
      p.created_at,
      u.id AS user_id,
      u.fullName AS customer_name,
      u.email AS customer_email,
      GROUP_CONCAT(DISTINCT b.id ORDER BY b.id SEPARATOR ', ') AS booking_numbers,
      GROUP_CONCAT(DISTINCT COALESCE(pk.name, s.name) ORDER BY b.id SEPARATOR ', ') AS items
    FROM payments p
    JOIN JSON_TABLE(
      CONCAT('[', COALESCE(NULLIF(p.booking_ids, ''), 'null'), ']'),
      '$[*]' COLUMNS (booking_id INT PATH '$' NULL ON EMPTY NULL ON ERROR)
    ) payment_booking
    JOIN bookings b ON b.id = payment_booking.booking_id
    LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN services s ON b.service_id = s.id
    LEFT JOIN packages pk ON b.package_id = pk.id
    GROUP BY
      p.id,
      p.reference_id,
      p.transaction_id,
      p.amount,
      p.booking_ids,
      p.status,
      p.payment_method,
      p.created_at,
      u.id,
      u.fullName,
      u.email
    ORDER BY p.created_at DESC
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error("Admin payments error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const payments = rows.map((payment) => ({
      ...payment,
      amount: Number(payment.amount) || 0,
    }));

    const paidStatuses = new Set(["completed", "success", "paid"]);
    const summary = payments.reduce(
      (totals, payment) => {
        const status = String(payment.status || "").toLowerCase();
        const isPaid = paidStatuses.has(status);

        return {
          totalRevenue: isPaid ? totals.totalRevenue + payment.amount : totals.totalRevenue,
          completedCount: isPaid ? totals.completedCount + 1 : totals.completedCount,
          pendingCount: status === "pending" ? totals.pendingCount + 1 : totals.pendingCount,
          failedCount:
            status === "failed" || status === "cancelled"
              ? totals.failedCount + 1
              : totals.failedCount,
          transactionCount: totals.transactionCount + 1,
        };
      },
      {
        totalRevenue: 0,
        completedCount: 0,
        pendingCount: 0,
        failedCount: 0,
        transactionCount: 0,
      }
    );

    res.json({ summary, payments });
  });
});

app.patch("/admin/payments/:id/status", verifyAdmin, (req, res) => {
  const paymentId = Number(req.params.id);
  const status = String(req.body.status || "").toLowerCase();
  const allowedStatuses = new Set(["pending", "completed", "failed", "cancelled"]);

  if (!paymentId) {
    return res.status(400).json({ message: "Invalid payment ID" });
  }

  if (!allowedStatuses.has(status)) {
    return res.status(400).json({ message: "Invalid payment status" });
  }

  db.query(
    "UPDATE payments SET status = ? WHERE id = ?",
    [status, paymentId],
    (err, result) => {
      if (err) {
        console.error("Admin payment status update error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json({ message: "Payment status updated", status });
    }
  );
});

app.post("/api/sentiment", (req, res) => {
  const { text } = req.body;  
  
  if (!text) {
    return res.status(400).json({ message: "Text is required" });
  }

  const result = analyzeSentiment(text);
  res.json(result); 
});

// Notification endpoints
app.get("/notifications", verifyUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const notifications = await NotificationManager.getNotifications(userId, limit);
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

app.get("/notifications/unread-count", verifyUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await NotificationManager.getUnreadCount(userId);
    res.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

app.put("/notifications/:id/read", verifyUser, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const success = await NotificationManager.markAsRead(notificationId, userId);
    if (success) {
      res.json({ message: "Notification marked as read" });
    } else {
      res.status(404).json({ message: "Notification not found" });
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

app.put("/notifications/mark-all-read", verifyUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const affectedRows = await NotificationManager.markAllAsRead(userId);
    res.json({ message: `${affectedRows} notifications marked as read` });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Failed to mark notifications as read" });
  }
});

// Unread chat message count for current user
app.get("/messages/unread-count", verifyUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [result] = await db.promise().query(
      "SELECT COUNT(*) AS unreadCount FROM messages WHERE receiverId = ? AND isRead = FALSE",
      [userId]
    );
    res.json({ unreadCount: result[0]?.unreadCount || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Unread chat message count per sender for admin
app.get("/admin/messages/unread-per-user", verifyAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const [results] = await db.promise().query(
      `SELECT senderId AS userId, COUNT(*) AS unreadCount
       FROM messages
       WHERE isRead = FALSE
         AND senderId IN (SELECT id FROM users WHERE role = 'users')
         AND (
           receiverId = ?
           OR receiverId = 999999
           OR receiverId IN (SELECT id FROM users WHERE role = 'admin')
         )
       GROUP BY senderId`,
      [adminId]
    );
    const counts = {};
    results.forEach(row => { counts[row.userId] = row.unreadCount; });
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Socket.io ready at http://localhost:${port}`);
});



