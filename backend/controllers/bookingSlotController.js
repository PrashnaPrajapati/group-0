const BookingSlot = require("../models/bookingSlotModel");

const SLOT_HOLD_MS = 2 * 60 * 1000;

const createBookingSlotController = (io) => {
  const slotHolds = new Map();
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

  const getBlockedSlotsForDate = async (date, includeHolds = true) => {
    const bookings = await BookingSlot.findBookedSlotsByDate(date);
    const blockedSlots = [];

    bookings.forEach((booking) => {
      const [hour, minute] = booking.booking_time.split(":").map(Number);
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

    return [...new Set([...blockedSlots, ...heldSlots])];
  };

  const ensureSlotAvailable = async (date, slot) => {
    const blockedSlots = await getBlockedSlotsForDate(date, false);
    return !blockedSlots.includes(slot);
  };

  const broadcastBookedSlot = (date, slot) => {
    const key = getSlotHoldKey(date, slot);
    releaseSlotHold(key);
    io.to(`booking_date_${date}`).emit("booking_slot_booked", { date, slot });
  };

  const registerSocketHandlers = () => {
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
  };

  return {
    broadcastBookedSlot,
    ensureSlotAvailable,
    getBlockedSlotsForDate,
    registerSocketHandlers,
  };
};

module.exports = createBookingSlotController;
