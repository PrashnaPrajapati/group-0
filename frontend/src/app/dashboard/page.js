"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useCallback, useEffect, useRef, useState } from "react";
import Footer from "@/components/Footer"; 
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { io } from "socket.io-client";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import { getToken } from "@/lib/authStorage";
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  ReceiptText,
  RotateCcw,
  Star,
  Wallet,
  XCircle,
} from "lucide-react";
 
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    console.error("Invalid token", e);
    return null;
  }
}

const RESCHEDULE_CUTOFF_MS = 12 * 60 * 60 * 1000;
const CANCELLATION_CHARGE_RATE = 0.15;
const paidPaymentStatuses = new Set(["completed", "success", "paid"]);
const createEmptyBookings = () => ({ upcoming: [], completed: [], missed: [], cancelled: [] });
const rescheduleCutoffMessage =
  "Bookings can only be rescheduled at least 12 hours before the appointment.";

function getBookingDateValue(booking) {
  return booking?.booking_date?.split("T")[0] || "";
}

function getBookingDateTime(booking) {
  const date = getBookingDateValue(booking);
  const time = String(booking?.booking_time || "").slice(0, 5);
  if (!date || !time) return null;

  const bookingDateTime = new Date(`${date}T${time}:00`);
  return Number.isNaN(bookingDateTime.getTime()) ? null : bookingDateTime;
}

function canRescheduleBooking(booking) {
  const bookingDateTime = getBookingDateTime(booking);
  return Boolean(bookingDateTime && bookingDateTime.getTime() - Date.now() >= RESCHEDULE_CUTOFF_MS);
}

function formatRupees(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function getPaymentDisplay(payment) {
  const status = String(payment?.status || "completed").toLowerCase();
  const hasCancelledBookings = Number(payment?.cancelledBookingCount || 0) > 0;

  if (hasCancelledBookings && paidPaymentStatuses.has(status)) {
    return {
      label: "Partially Refunded",
      className: "bg-amber-50 text-amber-700",
    };
  }

  if (status === "cancelled" || status === "failed") {
    return {
      label: status,
      className: "bg-red-50 text-red-700",
    };
  }

  if (status === "pending") {
    return {
      label: "Pending",
      className: "bg-blue-50 text-blue-700",
    };
  }

  return {
    label: status,
    className: "bg-emerald-50 text-emerald-700",
  };
}

export default function UserDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [bookings, setBookings] = useState(createEmptyBookings);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null); 
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");
 
  const [user, setUser] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState({
    totalSpent: 0,
    count: 0,
    payments: [],
  });
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [feedbackPromptDismissed, setFeedbackPromptDismissed] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
 
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [homeAddress, setHomeAddress] = useState(""); 
  const [reason, setReason] = useState(""); 
  const [bookedSlots, setBookedSlots] = useState([]);
  const [showCancellationCharge, setShowCancellationCharge] = useState(false);
 
  const [reasonCustom, setReasonCustom] = useState("");
 
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [privateFeedbackText, setPrivateFeedbackText] = useState("");
  const rescheduleSocketRef = useRef(null);
  const rescheduleDateRef = useRef("");
  const heldRescheduleSlotRef = useRef(null);

  const timeSlots = ["09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00","18:00"];

  const releaseHeldRescheduleSlot = useCallback(() => {
    const heldSlot = heldRescheduleSlotRef.current;
    if (!heldSlot || !rescheduleSocketRef.current) return;

    rescheduleSocketRef.current.emit("release_booking_slot", heldSlot);
    heldRescheduleSlotRef.current = null;
  }, []);

  useEffect(() => {
  if (!token) return;

  fetch(apiUrl("/profile"), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => res.json())
    .then((data) => setUser(data))
    .catch(() => setUser(null));
}, [token]);

  const fetchPaymentHistory = useCallback(() => {
    if (!token) return;

    setPaymentsLoading(true);
    fetch(apiUrl("/payments/history"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setPaymentSummary({
          totalSpent: Number(data.totalSpent) || 0,
          count: Number(data.count) || 0,
          payments: Array.isArray(data.payments) ? data.payments : [],
        });
      })
      .catch(() => {
        setPaymentSummary({ totalSpent: 0, count: 0, payments: [] });
      })
      .finally(() => setPaymentsLoading(false));
  }, [token]);

  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);
 
  useEffect(() => {
    setMounted(true);
    const t = getToken();
    setToken(t);

    if (!t) {
      setLoading(false);
      return;
    }
 
    const decoded = parseJwt(t);
    if (decoded && decoded.id) setUserId(decoded.id);

    fetch(apiUrl("/bookings/my"), {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(async (res) => {
        const data = await res.json();
        const groupedBookings = data.reduce((acc, booking) => {
          const status = booking.status.toLowerCase();
          if (!acc[status]) acc[status] = [];
          const existing = acc[status].some((item) => item.id === booking.id);
          if (!existing) {
            acc[status].push({
              id: booking.id,
              booking_date: booking.booking_date,
              booking_time: booking.booking_time,
              status: booking.status,
              address: booking.address,
              location_type: booking.location_type || "salon",
              services: booking.custom_service_names
                ? booking.custom_service_names.split(",").map((name) => ({
                    name: name.trim(),
                    price: null,
                  }))
                : booking.package_id
                  ? [{ name: booking.package_name, price: booking.package_price }]
                  : [{ name: booking.service_name, price: booking.service_price }],

              total_amount: booking.custom_service_price || (booking.package_id
                ? booking.package_price
                : booking.service_price),
              is_custom_booking: Boolean(booking.custom_service_names),
              review_submitted: booking.feedback_submitted || false,
              private_feedback_submitted: booking.private_feedback_submitted || false,
            });
          }
          return acc;
        }, createEmptyBookings());

        setBookings(groupedBookings);
        setLoading(false);
      })
      .catch(() => {
        setBookings(createEmptyBookings());
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    rescheduleDateRef.current = newDate;
  }, [newDate]);

  useEffect(() => {
    if (
      loading ||
      feedbackPromptDismissed ||
      showFeedbackModal ||
      showReviewModal ||
      showCancelModal ||
      showRescheduleModal
    ) {
      return;
    }

    const bookingNeedingFeedback = bookings.completed.find((booking) => !booking.private_feedback_submitted);
    if (!bookingNeedingFeedback) return;

    setCurrentBooking(bookingNeedingFeedback);
    setPrivateFeedbackText("");
    setFeedbackPromptDismissed(true);
    setShowFeedbackModal(true);
  }, [
    bookings.completed,
    feedbackPromptDismissed,
    loading,
    showCancelModal,
    showFeedbackModal,
    showRescheduleModal,
    showReviewModal,
  ]);

  useEffect(() => {
    if (!token) return;

    const bookingSocket = io(apiUrl(""));
    rescheduleSocketRef.current = bookingSocket;

    const addBlockedSlot = ({ date: eventDate, slot }) => {
      if (eventDate !== rescheduleDateRef.current || !slot) return;
      setBookedSlots((current) => (current.includes(slot) ? current : [...current, slot]));
    };

    const removeBlockedSlot = ({ date: eventDate, slot }) => {
      if (eventDate !== rescheduleDateRef.current || !slot) return;
      setBookedSlots((current) => current.filter((item) => item !== slot));
    };

    const handleHoldFailed = ({ date: eventDate, slot }) => {
      if (eventDate !== rescheduleDateRef.current || heldRescheduleSlotRef.current?.slot !== slot) return;

      heldRescheduleSlotRef.current = null;
      setNewTime("");
      setBookedSlots((current) => (current.includes(slot) ? current : [...current, slot]));
      toast.error("That time slot was just selected by another customer. Please choose another time.");
    };

    bookingSocket.on("booking_slot_held", addBlockedSlot);
    bookingSocket.on("booking_slot_booked", addBlockedSlot);
    bookingSocket.on("booking_slot_released", removeBlockedSlot);
    bookingSocket.on("booking_slot_hold_failed", handleHoldFailed);

    return () => {
      releaseHeldRescheduleSlot();
      bookingSocket.off("booking_slot_held", addBlockedSlot);
      bookingSocket.off("booking_slot_booked", addBlockedSlot);
      bookingSocket.off("booking_slot_released", removeBlockedSlot);
      bookingSocket.off("booking_slot_hold_failed", handleHoldFailed);
      bookingSocket.disconnect();
      rescheduleSocketRef.current = null;
    };
  }, [releaseHeldRescheduleSlot, token]);

  useEffect(() => {
    const bookingSocket = rescheduleSocketRef.current;
    if (!bookingSocket || !showRescheduleModal || !newDate) return;

    bookingSocket.emit("join_booking_date", { date: newDate });

    fetch(apiUrl(`/bookings/booked-slots?date=${newDate}`))
      .then(res => res.json())
      .then(data => setBookedSlots(Array.isArray(data) ? data : []))
      .catch(() => setBookedSlots([]));

    return () => {
      releaseHeldRescheduleSlot();
      bookingSocket.emit("leave_booking_date", { date: newDate });
    };
  }, [newDate, releaseHeldRescheduleSlot, showRescheduleModal]);

  if (!mounted) return null;
  if (!token) return <p className="p-6 text-red-500">You must be logged in.</p>;

  const filteredBookings = bookings[activeTab];
  const dashboardStats = [
    {
      label: "Upcoming",
      value: bookings.upcoming.length,
      icon: CalendarClock,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Completed",
      value: bookings.completed.length,
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Missed",
      value: bookings.missed.length,
      icon: Clock,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "Cancelled",
      value: bookings.cancelled.length,
      icon: XCircle,
      tone: "bg-red-50 text-red-700",
    },
    {
      label: "Spent",
      value: `Rs. ${paymentSummary.totalSpent.toLocaleString()}`,
      icon: Wallet,
      tone: "bg-rose-50 text-rose-700",
    },
  ];

  const statusClasses = {
    upcoming: "bg-blue-50 text-blue-700 border-blue-100",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    missed: "bg-amber-50 text-amber-700 border-amber-100",
    cancelled: "bg-red-50 text-red-700 border-red-100",
  };
  const filteredRescheduleTimeSlots = timeSlots.filter((slot) => {
    if (!newDate) return true;
    const selectedDate = new Date(`${newDate}T00:00:00`);
    const today = new Date();
    if (selectedDate.toDateString() !== today.toDateString()) return true;
    return Number(slot.split(":")[0]) > today.getHours();
  });
  const originalRescheduleDate = getBookingDateValue(currentBooking);
  const originalRescheduleTime = String(currentBooking?.booking_time || "").slice(0, 5);
  const originalRescheduleLocation = currentBooking?.location_type || "salon";
  const originalRescheduleAddress =
    originalRescheduleLocation === "home" ? currentBooking?.address || "" : "";
  const normalizedHomeAddress = homeAddress.trim();
  const hasRescheduleChanges =
    newDate !== originalRescheduleDate ||
    newTime !== originalRescheduleTime ||
    newLocation !== originalRescheduleLocation ||
    (newLocation === "home" && normalizedHomeAddress !== originalRescheduleAddress);
  const hasValidRescheduleValues =
    Boolean(newDate && newTime && newLocation) &&
    (newLocation !== "home" || Boolean(normalizedHomeAddress));
  const canCurrentBookingBeRescheduled = canRescheduleBooking(currentBooking);
  const canSaveReschedule =
    canCurrentBookingBeRescheduled && hasRescheduleChanges && hasValidRescheduleValues;
  const cancellationAmount = Number(currentBooking?.total_amount || 0);
  const cancellationCharge = cancellationAmount * CANCELLATION_CHARGE_RATE;
  const cancellationRefund = Math.max(cancellationAmount - cancellationCharge, 0);
 
  const openRescheduleModal = (booking) => {
    if (!canRescheduleBooking(booking)) {
      toast.error(rescheduleCutoffMessage);
      return;
    }

    setCurrentBooking(booking);
    setNewDate(getBookingDateValue(booking));
    setNewTime(String(booking.booking_time).slice(0, 5));
    setNewLocation(booking.location_type || "salon");
    setHomeAddress(booking.location_type === "home" ? booking.address : "");
    setReason("");
    setBookedSlots([]);
    setShowRescheduleModal(true);
  };

  const handleRescheduleTimeSelect = (slot) => {
    if (!newDate) return;

    const currentBookingTime = String(currentBooking?.booking_time || "").slice(0, 5);
    const isBlockedByAnotherCustomer = bookedSlots.includes(slot) && slot !== currentBookingTime;
    if (isBlockedByAnotherCustomer) return;

    if (
      heldRescheduleSlotRef.current?.slot !== slot ||
      heldRescheduleSlotRef.current?.date !== newDate
    ) {
      releaseHeldRescheduleSlot();
    }

    setNewTime(slot);
    heldRescheduleSlotRef.current = { date: newDate, slot };
    rescheduleSocketRef.current?.emit("hold_booking_slot", { date: newDate, slot });
  };

  const handleCancelReasonSelect = (selectedReason) => {
    if (selectedReason === "Need to change date/location") {
      setReason("");
      setReasonCustom("");
      setShowCancellationCharge(false);
      setShowCancelModal(false);
      if (currentBooking) openRescheduleModal(currentBooking);
      return;
    }

    setReason(selectedReason);
  };

  const handleReschedule = async () => {
    if (!currentBooking) return;
    if (!canCurrentBookingBeRescheduled) {
      toast.error(rescheduleCutoffMessage);
      return;
    }
    if (!canSaveReschedule) return;

    if (!newDate || !newTime || !newLocation) return alert("Please select date, time, and location");
    if (newLocation === "home" && (!homeAddress || homeAddress.trim() === "")) {
      return alert("Please enter your home address for home service");
    }

    const body = {
      booking_date: newDate,
      booking_time: newTime,
      location_type: newLocation,
      address: newLocation === "home" ? homeAddress : "salon",
      reason: newLocation === "home" ? null : reason || null,
    };

    try {
      const res = await fetch(apiUrl(`/bookings/${currentBooking.id}/reschedule`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.message || "Reschedule failed");
 
      setBookings(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(b =>
          b.id === currentBooking.id
            ? { ...b, booking_date: newDate, booking_time: newTime, address: body.address, location_type: newLocation }
            : b
        ),
      }));

      setShowRescheduleModal(false);
      releaseHeldRescheduleSlot();
      setHomeAddress("");
      setReason("");
      toast.success(data.message || "Booking rescheduled successfully.");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };
 
  const openCancelModal = (booking) => {
    setCurrentBooking(booking);
    setReason("");
    setReasonCustom("");
    setShowCancellationCharge(false);
    setShowCancelModal(true);
  };

  const handleCancel = async (cancelReason) => {
    if (!currentBooking) return;

    try {
      const res = await fetch(apiUrl(`/bookings/${currentBooking.id}/cancel`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: cancelReason || null }),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.message || "Cancel failed");
 
      setBookings(prev => {
        const updatedBookings = { ...prev };
        updatedBookings.cancelled = updatedBookings.cancelled.filter((b) => b.id !== currentBooking.id);
        updatedBookings.cancelled.push({ ...currentBooking, status: "cancelled" });
        updatedBookings[activeTab] = updatedBookings[activeTab].filter(b => b.id !== currentBooking.id);
        return updatedBookings;
      });

      setShowCancelModal(false);
      setReason("");
      setReasonCustom("");
      setShowCancellationCharge(false);
      fetchPaymentHistory();
      toast.success(data.message || "Booking cancelled.");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };
 
  const openReviewModal = (booking) => {
    setCurrentBooking(booking);
    setRating(0);
    setReviewText("");
    setShowFeedbackModal(false);
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setFeedbackPromptDismissed(true);
    setShowReviewModal(false);
  };

  const closeFeedbackModal = () => {
    setFeedbackPromptDismissed(true);
    setShowFeedbackModal(false);
    setPrivateFeedbackText("");
  };

  const handleSubmitPrivateFeedback = async () => {
    if (!currentBooking) return;

    if (privateFeedbackText.trim() === "") {
      toast.error("Please write your feedback first.");
      return;
    }

    try {
      const res = await fetch(apiUrl(`/bookings/${currentBooking.id}/feedback`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback: privateFeedbackText }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.message || "Feedback submission failed");
        return;
      }

      setBookings((prev) => ({
        ...prev,
        completed: prev.completed.map((booking) =>
          booking.id === currentBooking.id
            ? { ...booking, private_feedback_submitted: true }
            : booking
        ),
      }));

      closeFeedbackModal();
      toast.success("Thank you for your feedback!");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleSubmitReview = async () => {
    if (!currentBooking) return;
    if (!userId) {
      toast.error("User not logged in");
      return;
    }
    if (rating === 0 || reviewText.trim() === "") {
      toast.error("Please provide a rating and review.");
      return;
    }

    try {
      const res = await fetch(apiUrl(`/bookings/${currentBooking.id}/review`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, rating, review: reviewText }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.message || "Review submission failed");
        return;
      }

      setBookings(prev => ({
        ...prev,
        completed: prev.completed.map(b =>
          b.id === currentBooking.id
            ? { ...b, review_submitted: true }
            : b
        ),
      }));

      closeReviewModal();
      setRating(0);
      setReviewText("");
      toast.success("Thank you for your review!");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    }
  };
 
  return (
    <div className="min-h-screen bg-[#ffffff]">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <div className={`flex flex-col min-h-screen ${isOpen ? "md:ml-70" : "pl-16 md:pl-8"}`}>
      <Navbar />
      <div className="flex flex-col min-h-screen pt-20">
        <main className="flex-1 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <section className="mb-8 rounded-lg border border-rose-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                    Dashboard
                  </p>
                  <h1 className="mt-2 text-3xl font-bold text-gray-950 md:text-4xl">
                    Hi, {user?.fullName || "User"}
                  </h1>
                  <p className="mt-3 max-w-2xl text-gray-600">
                    View your bookings, reschedule upcoming appointments, cancel when needed, and leave reviews after completed services.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 xl:min-w-[700px]">
                  {dashboardStats.map((stat) => {
                    const StatIcon = stat.icon;

                    return (
                      <div key={stat.label} className="rounded-lg border border-rose-100 p-4">
                        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${stat.tone}`}>
                          <StatIcon size={20} />
                        </div>
                        <p className="text-2xl font-bold text-gray-950">{stat.value}</p>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {stat.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
              <div>
                <section className="mb-6 flex flex-col gap-4 rounded-lg border border-rose-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                      My Bookings
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-gray-950">
                      {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} appointments
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 rounded-lg border border-rose-200 bg-[#fffaf7] p-1 sm:grid-cols-4">
                    {["upcoming", "completed", "missed", "cancelled"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-md px-4 py-2 text-sm font-semibold capitalize transition ${
                          activeTab === tab
                            ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm"
                            : "text-gray-600 hover:bg-white hover:text-rose-700"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </section>
 
          {loading ? (
            <div className="rounded-lg border border-rose-100 bg-white p-10 text-center text-gray-500 shadow-sm">
              Loading your bookings...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-lg border border-rose-100 bg-white p-10 text-center shadow-sm">
              <CalendarCheck className="mx-auto mb-4 text-rose-500" size={34} />
              <p className="font-semibold text-gray-900">No {activeTab} bookings found.</p>
              <p className="mt-2 text-sm text-gray-500">
                Your {activeTab} appointments will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {filteredBookings.map((b, index) => {
                const canReschedule = canRescheduleBooking(b);

                return (
                <article
                  key={`${b.id}-${activeTab}-${index}`}
                  className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Booking ID: {b.id}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-gray-950">
                        {b.is_custom_booking
                          ? `Custom Services: ${b.services.map((s) => s.name).join(", ")}`
                          : b.package_id
                          ? `Package: ${b.services[0].name}`
                          : b.services.map((s) => s.name).join(", ")
                        }
                      </h3>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClasses[b.status?.toLowerCase()] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </div>

                  <div className="space-y-3 rounded-lg p-4 text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <CalendarCheck size={16} className="text-rose-600" />
                      {b.booking_date.split("T")[0]}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock size={16} className="text-rose-600" />
                      {b.booking_time}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin size={16} className="text-rose-600" />
                      {b.address || "Salon"}
                    </p>
                    <div className="flex items-center justify-between border-t border-rose-100 pt-3">
                      <span className="inline-flex items-center gap-2">
                        <ReceiptText size={16} className="text-rose-600" />
                        Total
                      </span>
                      <span className="font-bold text-gray-950">Rs. {b.total_amount}</span>
                    </div>
                  </div>
 
                  {b.status === "upcoming" && (
                    <div className="mt-5 flex gap-2">
                      <Button
                        onClick={() => openRescheduleModal(b)}
                        disabled={!canReschedule}
                        title={canReschedule ? "Reschedule booking" : rescheduleCutoffMessage}
                        className={`flex flex-1 items-center justify-center gap-2 py-2 ${
                          canReschedule ? "" : "cursor-not-allowed opacity-50"
                        }`}
                      >
                        <RotateCcw size={16} />
                        Reschedule
                      </Button>
                      <button onClick={() => openCancelModal(b)} className="flex-1 rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-600 transition hover:bg-red-100">
                        Cancel
                      </button>
                    </div>
                  )}
 
                  {b.status === "completed" && !b.review_submitted && (
                    <div className="mt-5 flex gap-2">
                      <Button onClick={() => openReviewModal(b)} className="flex flex-1 items-center justify-center gap-2 py-2">
                        <Star size={16} />
                        Leave Review
                      </Button>
                    </div>
                  )}
                </article>
                );
              })}
            </div>
          )}
              </div>

            <section className="rounded-lg border border-rose-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                    Payment History
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-gray-950">
                    Past payment records
                  </h2>
                </div>
                <div className="rounded-lg bg-[#fffaf7] px-4 py-3 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Total spent
                  </p>
                  <p className="text-2xl font-bold text-gray-950">
                    {formatRupees(paymentSummary.totalSpent)}
                  </p>
                </div>
              </div>

              {paymentsLoading ? (
                <div className="rounded-lg bg-[#fffaf7] p-6 text-center text-gray-500">
                  Loading payment history...
                </div>
              ) : paymentSummary.payments.length === 0 ? (
                <div className="rounded-lg bg-[#fffaf7] p-6 text-center">
                  <CreditCard className="mx-auto mb-3 text-rose-500" size={30} />
                  <p className="font-semibold text-gray-900">No payment records yet.</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Completed payments will appear here after checkout.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-rose-100">
                  <div className="hidden grid-cols-[1.4fr_1fr_0.9fr_0.8fr] gap-4 bg-[#fffaf7] px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 md:grid">
                    <span>Transaction</span>
                    <span>Booking</span>
                    <span>Status</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="divide-y divide-rose-100">
                    {paymentSummary.payments.slice(0, 5).map((payment) => {
                      const paymentDisplay = getPaymentDisplay(payment);
                      const hasCancelledBookings = Number(payment.cancelledBookingCount || 0) > 0;

                      return (
                        <article
                          key={payment.id || payment.transaction_id}
                          className="grid gap-3 px-4 py-4 md:grid-cols-[1.4fr_1fr_0.9fr_0.8fr] md:items-start"
                        >
                          <div>
                            <p className="font-semibold text-gray-950">
                              {payment.transaction_id || payment.reference_id || `Payment ${payment.id}`}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {payment.created_at
                                ? new Date(payment.created_at).toLocaleDateString()
                                : "Date unavailable"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              {payment.items || `Booking ${payment.booking_ids}`}
                            </p>
                            {hasCancelledBookings && (
                              <p className="mt-1 text-xs font-medium text-amber-700">
                                {payment.cancelledBookingCount} cancelled booking
                                {payment.cancelledBookingCount === 1 ? "" : "s"} included
                              </p>
                            )}
                          </div>
                          <div>
                            <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${paymentDisplay.className}`}>
                              {paymentDisplay.label}
                            </span>
                            {hasCancelledBookings && (
                              <div className="mt-2 space-y-1 text-xs text-gray-500">
                                <p>Charge: {formatRupees(payment.cancellationCharge)}</p>
                                <p>Refund: {formatRupees(payment.refundAmount)}</p>
                              </div>
                            )}
                          </div>
                          <p className="font-bold text-gray-950 md:text-right">
                            {formatRupees(payment.amount)}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
            </div>
          </div>
 
          {showRescheduleModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl w-96 max-h-[90vh] overflow-y-auto">
                <h2 className="text-gray-800 text-lg font-bold mb-4">Reschedule Booking</h2>

                <label className="text-gray-700 block mb-2">New Date</label>
                <input
                  type="date"
                  value={newDate}                  
                  min={new Date().toISOString().split('T')[0]}                  
                  onChange={(e) => {
                    releaseHeldRescheduleSlot();
                    setNewDate(e.target.value);
                    setNewTime("");
                  }}
                  className=" text-gray-700 w-full mb-3 p-2 border rounded"
                />

                <label className="block mb-3 text-gray-700 font-semibold">Choose a Time Slot</label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {filteredRescheduleTimeSlots.map((slot) => {
                    const currentBookingTime = String(currentBooking?.booking_time || "").slice(0, 5);
                    const isBooked = bookedSlots.includes(slot) && slot !== currentBookingTime;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isBooked}
                        onClick={() => handleRescheduleTimeSelect(slot)}
                        className={`flex items-center justify-center gap-2 border rounded-lg py-2 text-sm transition
                          ${isBooked
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : newTime === slot
                            ? "bg-pink-500 text-white border-pink-500"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                          }`}
                      >
                        <Clock size={14} />
                        <span>{slot}</span>
                        {isBooked && <XCircle size={14} />}
                      </button>
                    );
                  })}
                </div>

                <fieldset className="mb-4">
                  <legend className="mb-2 font-semibold text-gray-800">Service Location</legend>
                  <label className="flex items-center gap-2 text-gray-800 mb-2">
                    <input
                      type="radio"
                      value="salon"
                      checked={newLocation === "salon"}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-4 h-4 accent-pink-500"
                    />
                    Visit Salon
                  </label>

                  <label className="flex items-center gap-2 text-gray-800">
                    <input
                      type="radio"
                      value="home"
                      checked={newLocation === "home"}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-4 h-4 accent-pink-500"
                    />
                    Home Service
                  </label>
                </fieldset>

                {newLocation === "home" && (
                  <div className="mb-4">
                    <label className="block mb-1 text-gray-700">Enter your home address</label>
                    <input
                      type="text"
                      value={homeAddress}
                      onChange={(e) => setHomeAddress(e.target.value)}
                      placeholder="Enter your home address"
                      className="w-full p-2 border border-gray-300 rounded text-gray-700"
                    />
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleReschedule}
                    disabled={!canSaveReschedule}
                    className={`flex-1 py-2 rounded text-white transition ${
                      canSaveReschedule
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:scale-105"
                        : "cursor-not-allowed bg-gray-300"
                    }`}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      releaseHeldRescheduleSlot();
                      setShowRescheduleModal(false);
                    }}
                    className="flex-1 py-2 bg-gray-300 text-gray-700 rounded hover:scale-105 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
 
          {showCancelModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl w-96 max-h-[90vh] overflow-y-auto">
                <h2 className="text-gray-800 text-lg font-bold mb-4">Cancel Booking</h2>
                <p className="text-gray-700 mb-3">Are you sure you want to cancel this booking?</p>

                {!showCancellationCharge ? (
                  <>
                    <label className="text-gray-700 block mb-2 font-semibold">Select a Reason</label>
                    <div className="grid grid-cols-1 gap-2 mb-3">
                      {[
                        "Selected wrong service",
                        "Change of plans",
                        "Need to change date/location",
                        "Emergency/personal reasons",
                        "Service no longer needed",
                        "Found another salon",
                        "Other",
                      ].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleCancelReasonSelect(r)}
                          className={`w-full text-left py-2 px-3 border rounded-lg transition
                            ${reason === r
                              ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-400"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                            }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    {reason === "Other" && (
                      <div className="mb-3">
                        <textarea
                          value={reasonCustom}
                          onChange={(e) => setReasonCustom(e.target.value)}
                          placeholder="Type your reason here"
                          className="w-full p-2 border rounded text-gray-700"
                          rows={3}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-semibold text-red-800">Cancellation charge</p>
                    <p className="mt-1">
                      If you cancel a confirmed booking, 15% of the total booking amount will be deducted.
                    </p>
                    <div className="mt-3 space-y-1 text-gray-800">
                      <div className="flex justify-between gap-3">
                        <span>Total booking amount</span>
                        <span className="font-semibold">Rs. {cancellationAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Cancellation charge (15%)</span>
                        <span className="font-semibold text-red-700">Rs. {cancellationCharge.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-3 border-t border-red-100 pt-2">
                        <span>Estimated refund</span>
                        <span className="font-bold text-gray-950">Rs. {cancellationRefund.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  {!showCancellationCharge ? (
                    <>
                      {reason && (
                        <button
                          onClick={() => setShowCancellationCharge(true)}
                          disabled={reason === "Other" && !reasonCustom.trim()}
                          className={`flex-1 py-2 rounded text-white transition ${
                            reason === "Other" && !reasonCustom.trim()
                              ? "cursor-not-allowed bg-gray-300"
                              : "bg-gradient-to-r from-pink-500 to-purple-500 hover:scale-105"
                          }`}
                        >
                          Continue
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setReason("");
                          setReasonCustom("");
                          setShowCancellationCharge(true);
                        }}
                        className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition"
                      >
                        Skip Reason
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleCancel(reason === "Other" ? reasonCustom : reason)}
                        className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded hover:scale-105 transition"
                      >
                        Confirm Cancel
                      </button>
                      <button
                        onClick={() => setShowCancellationCharge(false)}
                        className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition"
                      >
                        Back
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => {
                      setShowCancellationCharge(false);
                      setShowCancelModal(false);
                    }}
                    className="flex-1 py-2 bg-gray-300 text-gray-700 rounded hover:scale-105 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
 
          {showFeedbackModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl w-96 max-h-[90vh] overflow-y-auto">
                <h2 className="text-gray-800 text-lg font-bold mb-2">Help us improve</h2>
                <p className="mb-4 text-sm text-gray-500">
                  This feedback is private and helps us improve service quality.
                </p>

                <textarea
                  value={privateFeedbackText}
                  onChange={(e) => setPrivateFeedbackText(e.target.value)}
                  placeholder="What can we improve for next time?"
                  className="w-full p-2 border rounded text-gray-700 mb-4"
                  rows={5}
                />

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleSubmitPrivateFeedback}
                    className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded hover:scale-105 transition"
                  >
                    Submit Feedback
                  </button>
                  <button
                    onClick={closeFeedbackModal}
                    className="flex-1 py-2 bg-gray-300 text-gray-700 rounded hover:scale-105 transition"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          )}

          {showReviewModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl w-96 max-h-[90vh] overflow-y-auto">
                <h2 className="text-gray-800 text-lg font-bold mb-2">Leave Review</h2>
                <p className="mb-4 text-sm text-gray-500">
                  Share a public review about your completed service.
                </p>

                <p className="text-gray-700 mb-2">Rate your experience:</p>
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`w-8 h-8 text-xl flex items-center justify-center rounded-full ${
                        rating >= star
                          ? "bg-yellow-400"
                          : "bg-gray-300"
                      } cursor-pointer`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your public review..."
                  className="w-full p-2 border rounded text-gray-700 mb-4"
                  rows={4}
                />

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleSubmitReview}
                    className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded hover:scale-105 transition"
                  >
                    Submit Review
                  </button>
                  <button
                    onClick={closeReviewModal}
                    className="flex-1 py-2 bg-gray-300 text-gray-700 rounded hover:scale-105 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
    </div>

  );
}
