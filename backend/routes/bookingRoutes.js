const express = require("express");
const createBookingController = require("../controllers/bookingController");
const { verifyAdmin, verifyUser } = require("../middleware/authMiddleware");

const createBookingRoutes = (dependencies) => {
  const router = express.Router();
  const controller = createBookingController(dependencies);

  router.post("/bookings", verifyUser, controller.createBooking);
  router.get("/bookings/my", verifyUser, controller.getMyBookings);
  router.get("/admin/bookings", verifyAdmin, controller.getAdminBookings);
  router.get("/admin/feedback", verifyAdmin, controller.getAdminFeedback);
  router.put("/bookings/:id/cancel", verifyUser, controller.cancelBooking);
  router.patch("/bookings/payment-failed", verifyUser, controller.cancelFailedPaymentBookings);
  router.put("/bookings/:id/reschedule", controller.rescheduleBooking);
  router.put("/admin/bookings/:id/status", controller.updateAdminBookingStatus);
  router.get("/bookings/booked-slots", controller.getBookedSlots);
  router.post("/bookings/:id/feedback", verifyUser, controller.submitPrivateFeedback);
  router.post("/bookings/:id/review", verifyUser, controller.submitReview);
  router.get("/bookings/:id/review", controller.getBookingReview);
  router.post("/bookings/package", verifyUser, controller.createPackageBookings);
  router.patch("/bookings/confirm", verifyUser, controller.confirmBookings);

  return router;
};

module.exports = createBookingRoutes;
