require("dotenv").config();
const express = require("express");
const cors = require("cors"); 
const http = require('http');  
const socketIo = require('socket.io');
const { initializeChat } = require("./sockets/chatSocket"); 
const NotificationService = require("./services/notificationService");
const { verifyEmailTransport } = require("./services/emailService");
const adminUserRoutes = require("./routes/adminUserRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const authRoutes = require("./routes/authRoutes");
const createBookingSlotController = require("./controllers/bookingSlotController");
const createBookingRoutes = require("./routes/bookingRoutes");
const healthRoutes = require("./routes/healthRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const packageRoutes = require("./routes/packageRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const profileRoutes = require("./routes/profileRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const sentimentRoutes = require("./routes/sentimentRoutes");


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
 
app.use(cors({ origin: "http://localhost:3000", credentials: true })); 
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.static('public'));
app.use(healthRoutes);
app.use(adminUserRoutes);
app.use(analyticsRoutes);
app.use(authRoutes);
app.use(messageRoutes);
app.use(notificationRoutes);
app.use(packageRoutes);
app.use(paymentRoutes);
app.use(profileRoutes);
app.use(reviewRoutes);
app.use(serviceRoutes);
app.use(sentimentRoutes);

const notificationService = new NotificationService(io);
verifyEmailTransport().catch((error) => {
  console.error("Email service connection failed:", {
    code: error.code,
    command: error.command,
    response: error.response,
    message: error.message,
  });
});
 
initializeChat(io, notificationService);
 
const bookingSlotController = createBookingSlotController(io);
bookingSlotController.registerSocketHandlers();

app.use(
  createBookingRoutes({
    broadcastBookedSlot: bookingSlotController.broadcastBookedSlot,
    ensureSlotAvailable: bookingSlotController.ensureSlotAvailable,
    getBlockedSlotsForDate: bookingSlotController.getBlockedSlotsForDate,
    io,
    notificationService,
  })
);

app.use((err, req, res, next) => {
  if (err.message === "IMAGEKIT_PRIVATE_KEY is not configured") {
    return res.status(500).json({ message: "Image upload is not configured" });
  }

  if (err.name === "MulterError" || err.message?.includes("images are allowed")) {
    return res.status(400).json({ message: err.message });
  }

  console.error("Unhandled server error:", err);
  res.status(500).json({ message: "Server error" });
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Socket.io ready at http://localhost:${port}`);
});



