const Booking = require("../models/bookingModel");
const { sendBookingConfirmedEmail } = require("../emailService");

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

const isPastBookingDate = (bookingDate) => {
  const [year, month, day] = bookingDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date < today;
};

const createBookingController = ({
  broadcastBookedSlot,
  ensureSlotAvailable,
  getBlockedSlotsForDate,
  io,
  notificationService,
}) => {
  const sendBookingConfirmedUpdates = async (booking) => {
    try {
      await notificationService.notifyBookingConfirmed({
        userId: booking.user_id,
        bookingId: booking.id,
        itemName: booking.item_name,
        bookingDate: formatDateForSlot(booking.booking_date),
        bookingTime: String(booking.booking_time || "").slice(0, 5),
      });
    } catch (notificationError) {
      console.error("Error sending booking confirmation notification:", notificationError);
    }

    try {
      await sendBookingConfirmedEmail({
        to: booking.email,
        fullName: booking.fullName,
        itemName: booking.item_name,
        bookingDate: booking.booking_date,
        bookingTime: booking.booking_time,
      });
    } catch (emailError) {
      console.error("Error sending booking confirmation email:", {
        code: emailError.code,
        command: emailError.command,
        response: emailError.response,
        message: emailError.message,
      });
    }
  };

  const sendBookingReceivedNotification = async (booking) => {
    try {
      await notificationService.notifyUserBookingReceived({
        userId: booking.user_id,
        bookingId: booking.id,
        itemName: booking.item_name,
        bookingDate: formatDateForSlot(booking.booking_date),
        bookingTime: String(booking.booking_time || "").slice(0, 5),
      });
    } catch (notificationError) {
      console.error("Error sending user booking received notification:", notificationError);
    }
  };

  const createBooking = async (req, res) => {
    try {
      const {
        service_ids,
        package_id,
        booking_date,
        booking_time,
        notes,
        location_type,
        address,
        payment_method,
      } = req.body;
      const userId = req.user.id;
      const initialStatus = payment_method === "esewa" ? "pending" : "upcoming";

      if (!booking_date || !booking_time) {
        return res.status(400).json({ message: "Date and time are required" });
      }

      if (isPastBookingDate(booking_date)) {
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

      const isAvailable = await ensureSlotAvailable(booking_date, booking_time);
      if (!isAvailable) {
        return res.status(409).json({ message: "This time slot is already booked" });
      }

      if (package_id) {
        const duplicatePackage = await Booking.findDuplicatePackageBooking(userId, package_id);
        if (duplicatePackage) {
          return res.status(400).json({ message: "You have already booked this package" });
        }

        const bookingId = await Booking.createPackageBooking({
          userId,
          packageId: package_id,
          bookingDate: booking_date,
          bookingTime: booking_time,
          notes,
          status: initialStatus,
          locationType: location_type,
          address,
        });

        const packageDetails = await Booking.findPackageName(package_id);
        if (packageDetails) {
          try {
            await notificationService.notifyNewBooking({
              userId,
              bookingId,
              serviceName: null,
              packageName: packageDetails.name,
              bookingDate: booking_date,
              bookingTime: booking_time,
            });
          } catch (notificationError) {
            console.error("Error sending booking notification:", notificationError);
          }
        }

        if (initialStatus === "upcoming") {
          const confirmationDetails = await Booking.findBookingConfirmationDetails(bookingId);
          if (confirmationDetails) {
            await sendBookingConfirmedUpdates(confirmationDetails);
          }
        } else {
          const bookingDetails = await Booking.findBookingConfirmationDetails(bookingId);
          if (bookingDetails) {
            await sendBookingReceivedNotification(bookingDetails);
          }
        }

        broadcastBookedSlot(booking_date, booking_time);
        return res.json({ message: "Package booking successful", bookingId });
      }

      if (normalizedServiceIds.length > 1) {
        const serviceRows = await Booking.findActiveServicesByIds(normalizedServiceIds);
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

        const bookingId = await Booking.createCustomServiceBooking({
          userId,
          bookingDate: booking_date,
          bookingTime: booking_time,
          notes,
          status: initialStatus,
          locationType: location_type,
          address,
          serviceIds: normalizedServiceIds,
          serviceNames: customServiceNames,
          servicePrice: customServicePrice,
          serviceDuration: customServiceDuration,
        });

        try {
          await notificationService.notifyNewBooking({
            userId,
            bookingId,
            serviceName: customServiceNames,
            packageName: null,
            bookingDate: booking_date,
            bookingTime: booking_time,
          });
        } catch (notificationError) {
          console.error("Error sending custom booking notification:", notificationError);
        }

        if (initialStatus === "upcoming") {
          const confirmationDetails = await Booking.findBookingConfirmationDetails(bookingId);
          if (confirmationDetails) {
            await sendBookingConfirmedUpdates(confirmationDetails);
          }
        } else {
          const bookingDetails = await Booking.findBookingConfirmationDetails(bookingId);
          if (bookingDetails) {
            await sendBookingReceivedNotification(bookingDetails);
          }
        }

        broadcastBookedSlot(booking_date, booking_time);
        return res.json({ message: "Custom booking successful", bookingId });
      }

      const duplicates = await Booking.findDuplicateServiceBookings(userId, normalizedServiceIds);
      if (duplicates.length > 0) {
        return res.status(400).json({ message: "You have already booked one or more of these services" });
      }

      const insertedBookingIds = [];
      for (const serviceId of normalizedServiceIds) {
        const bookingId = await Booking.createServiceBooking({
          userId,
          serviceId,
          bookingDate: booking_date,
          bookingTime: booking_time,
          notes,
          status: initialStatus,
          locationType: location_type,
          address,
        });
        insertedBookingIds.push(bookingId);
      }

      await Promise.all(
        insertedBookingIds.map(async (bookingId, index) => {
          try {
            const serviceId = normalizedServiceIds[index];
            const service = await Booking.findServiceName(serviceId);

            await notificationService.notifyNewBooking({
              userId,
              bookingId,
              serviceName: service?.name,
              packageName: null,
              bookingDate: booking_date,
              bookingTime: booking_time,
            });
          } catch (error) {
            console.error("Error sending service booking notification:", error);
          }
        })
      );

      if (initialStatus === "upcoming") {
        await Promise.all(
          insertedBookingIds.map(async (bookingId) => {
            const confirmationDetails = await Booking.findBookingConfirmationDetails(bookingId);
            if (confirmationDetails) {
              await sendBookingConfirmedUpdates(confirmationDetails);
            }
          })
        );
      } else {
        await Promise.all(
          insertedBookingIds.map(async (bookingId) => {
            const bookingDetails = await Booking.findBookingConfirmationDetails(bookingId);
            if (bookingDetails) {
              await sendBookingReceivedNotification(bookingDetails);
            }
          })
        );
      }

      broadcastBookedSlot(booking_date, booking_time);
      return res.json({ message: "Booking successful", bookingIds: insertedBookingIds });
    } catch (err) {
      console.error("Booking error:", err);
      return res.status(500).json({ message: "DB error", error: err.message });
    }
  };

  const getMyBookings = async (req, res) => {
    try {
      await Booking.markMissedBookings();
      const bookings = await Booking.findUserBookings(req.user.id);
      res.json(bookings);
    } catch (err) {
      res.status(500).json({ message: "DB error" });
    }
  };

  const getAdminBookings = async (req, res) => {
    try {
      await Booking.markMissedBookings();
      const bookings = await Booking.findAdminBookings();
      res.json(bookings);
    } catch (err) {
      res.status(500).json({ message: "DB error" });
    }
  };

  const getAdminFeedback = async (req, res) => {
    try {
      const feedback = await Booking.findAdminPrivateFeedback();
      res.json(feedback);
    } catch (err) {
      console.error("Admin feedback error:", err.stack || err);
      res.status(500).json({ message: "DB error" });
    }
  };

  const cancelBooking = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.id;
      const booking = await Booking.findBookingForCancellation(bookingId, userId);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const cancellationAmount = Number(booking.booking_amount) || 0;
      const cancellationCharge = Number((cancellationAmount * CANCELLATION_CHARGE_RATE).toFixed(2));
      const estimatedRefund = Number(Math.max(cancellationAmount - cancellationCharge, 0).toFixed(2));

      await Booking.cancelUserBooking(bookingId, userId);

      try {
        await notificationService.notifyBookingCancellation({
          userId,
          bookingId,
          serviceName: booking.service_name || booking.custom_service_names,
          packageName: booking.package_name,
          bookingDate: booking.booking_date,
          bookingTime: booking.booking_time,
        });
      } catch (notificationError) {
        console.error("Error sending cancellation notification:", notificationError);
      }

      res.json({
        message: `Booking cancelled. 15% cancellation charge deducted: Rs. ${cancellationCharge.toFixed(2)}. Estimated refund: Rs. ${estimatedRefund.toFixed(2)}.`,
        cancellationCharge,
        estimatedRefund,
      });
    } catch (err) {
      res.status(500).json({ message: "DB error" });
    }
  };

  const cancelFailedPaymentBookings = async (req, res) => {
    try {
      const { bookingIds } = req.body;

      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ message: "No booking IDs provided" });
      }

      const cancelledCount = await Booking.cancelFailedPaymentBookings(bookingIds, req.user.id);
      res.json({ message: "Failed payment booking cancelled", cancelledCount });
    } catch (err) {
      res.status(500).json({ message: "DB error" });
    }
  };

  const rescheduleBooking = async (req, res) => {
    try {
      const bookingId = req.params.id;
      let { booking_date, booking_time, location_type, reason, address } = req.body;
      const booking = await Booking.findBookingById(bookingId);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (isBeforeRescheduleCutoff(booking.booking_date, booking.booking_time)) {
        return res.status(400).json({ message: RESCHEDULE_CUTOFF_MESSAGE });
      }

      booking_date = formatDateForSlot(booking_date || booking.booking_date);
      booking_time = booking_time || booking.booking_time;
      location_type = location_type || booking.location_type || "salon";
      address = location_type === "home" ? (address || booking.address || "") : "salon";

      if (!booking_date) return res.status(400).json({ message: "Booking date is required" });
      if (isPastBookingDate(booking_date)) {
        return res.status(400).json({ message: "Booking date must be today or in the future" });
      }
      if (!booking_time) return res.status(400).json({ message: "Booking time is required" });

      if (booking_time.length === 5) booking_time += ":00";
      const normalizedBookingTime = booking_time.slice(0, 5);
      const originalBookingDate = formatDateForSlot(booking.booking_date);
      const originalBookingTime = String(booking.booking_time).slice(0, 5);
      const isOriginalSlot =
        booking_date === originalBookingDate && normalizedBookingTime === originalBookingTime;

      const isAvailable = await ensureSlotAvailable(booking_date, normalizedBookingTime);
      if (!isAvailable && !isOriginalSlot) {
        return res.status(409).json({ message: "Selected time slot is no longer available" });
      }

      await Booking.updateRescheduledBooking({
        bookingId,
        bookingDate: booking_date,
        bookingTime: booking_time,
        locationType: location_type,
        address,
        reason,
      });

      if (!isOriginalSlot) {
        io.to(`booking_date_${originalBookingDate}`).emit("booking_slot_released", {
          date: originalBookingDate,
          slot: originalBookingTime,
        });
        broadcastBookedSlot(booking_date, normalizedBookingTime);
      }

      res.json({ message: "Booking rescheduled successfully" });
    } catch (err) {
      console.error("Slot availability error:", err);
      res.status(500).json({ message: "Could not verify slot availability" });
    }
  };

  const updateAdminBookingStatus = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const { status } = req.body;
      const allowedStatuses = new Set(["completed", "missed"]);

      if (!allowedStatuses.has(status)) {
        return res.status(400).json({ message: "Admin can only change status to completed or missed" });
      }

      const booking = await Booking.findBookingStatus(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status !== "upcoming") {
        return res.status(400).json({ message: "Admin can only change upcoming bookings to completed or missed" });
      }

      await Booking.updateBookingStatus(bookingId, status);
      try {
        if (status === "completed") {
          await notificationService.notifyBookingCompleted({
            userId: booking.user_id,
            bookingId,
          });
        } else if (status === "missed") {
          await notificationService.notifyBookingMissed({
            userId: booking.user_id,
            bookingId,
          });
        }
      } catch (notificationError) {
        console.error("Error sending booking status notification:", notificationError);
      }

      return res.status(200).json({ message: "Booking status updated successfully" });
    } catch (err) {
      console.error("Error updating booking status:", err);
      return res.status(500).json({ message: "Server error" });
    }
  };

  const getBookedSlots = async (req, res) => {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }

      const blockedSlots = await getBlockedSlotsForDate(date);
      res.json(blockedSlots);
    } catch (err) {
      console.error("DB Error:", err);
      res.status(500).json({ message: "DB error", error: err.message });
    }
  };

  const submitReview = async (req, res) => {
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
      const booking = await Booking.findBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const existingReview = await Booking.findFeedbackByBookingAndUser(bookingId, userId);
      if (existingReview) {
        return res.status(400).json({ message: "Review already submitted for this booking" });
      }

      await Booking.createFeedback({ bookingId, userId, rating, review });
      await Booking.markFeedbackSubmitted(bookingId);

      return res.json({ message: "Review submitted successfully" });
    } catch (err) {
      console.error("Review route error:", err.stack || err);
      return res.status(500).json({ message: "Database error occurred", error: err.message });
    }
  };

  const submitPrivateFeedback = async (req, res) => {
    const bookingId = req.params.id;
    const userId = req.user?.id;
    const feedback = String(req.body?.feedback || "").trim();

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in" });
    }

    if (!feedback) {
      return res.status(400).json({ message: "Feedback is required" });
    }

    try {
      const booking = await Booking.findBookingById(bookingId);
      if (!booking || Number(booking.user_id) !== Number(userId)) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status !== "completed") {
        return res.status(400).json({ message: "Feedback can only be submitted for completed bookings" });
      }

      const existingFeedback = await Booking.findPrivateFeedbackByBookingAndUser(bookingId, userId);
      if (existingFeedback) {
        return res.status(400).json({ message: "Feedback already submitted for this booking" });
      }

      await Booking.createPrivateFeedback({ bookingId, userId, feedback });

      return res.json({ message: "Feedback submitted successfully" });
    } catch (err) {
      console.error("Private feedback route error:", err.stack || err);
      return res.status(500).json({ message: "Database error occurred", error: err.message });
    }
  };

  const getBookingReview = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const rows = await Booking.findReviewsByBookingId(bookingId);

      res.json({
        bookingId,
        reviews: rows.map((feedback) => ({
          customer: feedback.customer,
          rating: feedback.rating,
          review: feedback.feedback_text,
          submittedAt: feedback.created_at,
        })),
      });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Database error", error: err.message });
    }
  };

  const createPackageBookings = async (req, res) => {
    try {
      const { package_id, booking_date, booking_time, notes, location_type, address } = req.body;
      const userId = req.user.id;

      if (!package_id || !booking_date || !booking_time || !location_type) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      const serviceIds = await Booking.findPackageServiceIds(package_id);
      if (!serviceIds.length) {
        return res.status(400).json({ message: "Package has no services" });
      }

      await Booking.createPackageServiceBookings({
        userId,
        serviceIds,
        bookingDate: booking_date,
        bookingTime: booking_time,
        notes,
        locationType: location_type,
        address,
      });

      res.json({ message: "Package booked successfully", service_count: serviceIds.length });
    } catch (err) {
      res.status(500).json({ message: "Booking failed", error: err });
    }
  };

  const confirmBookings = async (req, res) => {
    try {
      const { bookingIds } = req.body;
      const userId = req.user.id;

      console.log("Confirm request - user_id:", userId, "bookingIds:", bookingIds);

      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ message: "No booking IDs provided" });
      }

      const existingBookings = await Booking.findBookingsForUser(bookingIds, userId);
      console.log("Found bookings:", existingBookings);

      if (existingBookings.length === 0) {
        return res.status(400).json({
          message: "No bookings found for these IDs and user",
          requestedIds: bookingIds,
          user_id: userId,
        });
      }

      const confirmedCount = await Booking.confirmBookings(bookingIds, userId);
      console.log("Update result:", { affectedRows: confirmedCount });

      if (confirmedCount === 0) {
        return res.status(400).json({
          message: "No bookings were updated. They may not exist, user mismatch, or already confirmed.",
          existingBookings,
        });
      }

      await Promise.all(
        existingBookings.map((booking) =>
          sendBookingConfirmedUpdates(booking)
        )
      );

      res.json({
        message: "Bookings confirmed successfully",
        confirmedCount,
        bookingIds,
      });
    } catch (err) {
      console.error("DB Error updating:", err);
      return res.status(500).json({ message: "DB error updating bookings", error: err.message });
    }
  };

  return {
    cancelBooking,
    cancelFailedPaymentBookings,
    confirmBookings,
    createBooking,
    createPackageBookings,
    getAdminBookings,
    getAdminFeedback,
    getBookedSlots,
    getBookingReview,
    getMyBookings,
    rescheduleBooking,
    submitPrivateFeedback,
    submitReview,
    updateAdminBookingStatus,
  };
};

module.exports = createBookingController;
