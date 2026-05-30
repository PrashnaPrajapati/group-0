const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const isEmailConfigured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const formatBookingDate = (value) => {
  if (!value) return "";
  return value instanceof Date ? value.toISOString().split("T")[0] : String(value).split("T")[0];
};

const sendBookingConfirmedEmail = async ({
  to,
  fullName,
  itemName,
  bookingDate,
  bookingTime,
}) => {
  if (!to) {
    console.warn("Booking confirmation email skipped: recipient email is missing");
    return false;
  }

  if (!isEmailConfigured()) {
    console.warn("Booking confirmation email skipped: EMAIL_USER or EMAIL_PASS is missing");
    return false;
  }

  const info = await transporter.sendMail({
    from: `"Singar Glow" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your Singar Glow booking is confirmed",
    text: `Hello ${fullName || ""},\n\nYour booking for ${itemName || "your service"} is confirmed.\n\nDate: ${formatBookingDate(bookingDate)}\nTime: ${String(bookingTime || "").slice(0, 5)}\n\nYou can view your booking details in your dashboard.\n\nThank you,\nThe Singar Glow Team`,
  });

  console.log(`Booking confirmation email sent to ${to}: ${info.messageId || "sent"}`);
  return true;
};

const verifyEmailTransport = async () => {
  if (!isEmailConfigured()) {
    console.warn("Email is not configured: EMAIL_USER or EMAIL_PASS is missing");
    return false;
  }

  await transporter.verify();
  console.log("Email service connected successfully");
  return true;
};

module.exports = {
  sendBookingConfirmedEmail,
  verifyEmailTransport,
};
