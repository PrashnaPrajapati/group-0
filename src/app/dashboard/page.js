"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
 
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    console.error("Invalid token", e);
    return null;
  }
}

export default function UserDashboard() {
  const [bookings, setBookings] = useState({ upcoming: [], completed: [], cancelled: [] });
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null); 
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");
 
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
 
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [homeAddress, setHomeAddress] = useState(""); 
  const [reason, setReason] = useState(""); 
  const [bookedSlots, setBookedSlots] = useState([]);
 
  const [reasonCustom, setReasonCustom] = useState("");
 
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");

  const timeSlots = ["09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00","18:00"];
 
  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("token");
    setToken(t);

    if (!t) {
      setLoading(false);
      return;
    }
 
    const decoded = parseJwt(t);
    if (decoded && decoded.id) setUserId(decoded.id);

    fetch("http://localhost:5001/bookings/my", {
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
              services: booking.package_id
                ? [{ name: booking.package_name, price: booking.package_price }]
                : [{ name: booking.service_name, price: booking.service_price }],

              total_amount: booking.package_id
                ? booking.package_price
                : booking.service_price,
              feedback_submitted: booking.feedback_submitted || false,
            });
          }
          return acc;
        }, { upcoming: [], completed: [], cancelled: [] });

        setBookings(groupedBookings);
        setLoading(false);
      })
      .catch(() => {
        setBookings({ upcoming: [], completed: [], cancelled: [] });
        setLoading(false);
      });
  }, []);

  if (!mounted) return null;
  if (!token) return <p className="p-6 text-red-500">You must be logged in.</p>;

  const filteredBookings = bookings[activeTab];
 
  const openRescheduleModal = (booking) => {
    setCurrentBooking(booking);
    setNewDate(booking.booking_date.split("T")[0]);
    setNewTime(booking.booking_time);
    setNewLocation(booking.location_type || "salon");
    setHomeAddress(booking.location_type === "home" ? booking.address : "");
    setReason("");
    setBookedSlots([]);
    setShowRescheduleModal(true);

    fetch(`http://localhost:5001/bookings/booked-slots?date=${booking.booking_date.split("T")[0]}`)
      .then(res => res.json())
      .then(data => setBookedSlots(data))
      .catch(() => setBookedSlots([]));
  };

  const handleReschedule = async () => {
    if (!currentBooking) return;

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
      const res = await fetch(`http://localhost:5001/bookings/${currentBooking.id}/reschedule`, {
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
      setHomeAddress("");
      setReason("");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };
 
  const openCancelModal = (booking) => {
    setCurrentBooking(booking);
    setReason("");
    setReasonCustom("");
    setShowCancelModal(true);
  };

  const handleCancel = async (cancelReason) => {
    if (!currentBooking) return;

    try {
      const res = await fetch(`http://localhost:5001/bookings/${currentBooking.id}/cancel`, {
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
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };
 
  const openFeedbackModal = (booking) => {
    setCurrentBooking(booking);
    setRating(0);
    setFeedbackText("");
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = async () => {
    if (!currentBooking) return;
    if (!userId) {
      toast.error("User not logged in");
      return;
    }
    if (rating === 0 || feedbackText.trim() === "") {
      toast.error("Please provide a rating and feedback.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5001/bookings/${currentBooking.id}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, rating, feedback: feedbackText }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.message || "Feedback submission failed");
        return;
      }

      setBookings(prev => ({
        ...prev,
        completed: prev.completed.map(b =>
          b.id === currentBooking.id
            ? { ...b, feedback_submitted: true }
            : b
        ),
      }));

      setShowFeedbackModal(false);
      setRating(0);
      setFeedbackText("");
      toast.success("Thank you for your feedback!");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    }
  };
 
  return (
    <div className="min-h-screen bg-[#fff7fa]">
      <Sidebar />
      <div className="flex flex-col min-h-screen md:ml-64">
        <main className="flex-1 p-6">
          <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
            My Dashboard
          </h1>
 
          <div className="flex gap-6 mb-6 border-b border-gray-200">
            {["upcoming", "completed", "cancelled"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 font-semibold transition-colors ${activeTab === tab ? "border-b-2 border-pink-500 text-pink-500" : "text-gray-500 hover:text-pink-500"} capitalize`}
              >
                {tab}
              </button>
            ))}
          </div>
 
          {loading ? (
            <p className="text-gray-500">Loading your bookings...</p>
          ) : filteredBookings.length === 0 ? (
            <p className="text-gray-500">No {activeTab} bookings found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBookings.map((b, index) => (
                <div key={`${b.id}-${activeTab}-${index}`} className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition relative">
                  <span className={`absolute top-3 right-3 px-3 py-1 text-sm font-semibold rounded-full ${b.status === "upcoming" ? "bg-blue-100 text-blue-600" : b.status === "completed" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  </span>

                  <h2 className="text-lg font-semibold text-gray-800 mb-1">
                    {b.package_id
                      ? `Package: ${b.services[0].name}`
                      : b.services.map((s) => s.name).join(", ")
                    }
                  </h2>
                  <p className="text-gray-500 text-sm mb-2">Booking ID: {b.id}</p>

                  <div className="text-gray-600 text-sm space-y-1 mb-4">
                    <p>📅 {b.booking_date.split("T")[0]}</p>
                    <p>⏰ {b.booking_time}</p>
                    <p>📍 {b.address || "Salon"}</p>
                    <hr className="my-2" />
                    <p className="text-base font-bold text-pink-400">Total Amount: Rs.{b.total_amount}</p>
                  </div>
 
                  {b.status === "upcoming" && (
                    <div className="flex gap-2">
                      <button onClick={() => openRescheduleModal(b)} className="flex-1 py-2 px-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded hover:scale-105 transition">
                        Reschedule
                      </button>
                      <button onClick={() => openCancelModal(b)} className="flex-1 py-2 px-3 bg-red-100 text-red-600 rounded hover:scale-105 transition">
                        Cancel
                      </button>
                    </div>
                  )}
 
                  {b.status === "completed" && !b.feedback_submitted && (
                    <div className="flex gap-2">
                      <button onClick={() => openFeedbackModal(b)} className="flex-1 py-2 px-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded hover:scale-105 transition">
                        Leave Feedback
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
 
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
                    setNewDate(e.target.value);
                    fetch(`http://localhost:5001/bookings/booked-slots?date=${e.target.value}`)
                      .then(res => res.json())
                      .then(data => setBookedSlots(data))
                      .catch(() => setBookedSlots([]));
                  }}
                  className=" text-gray-700 w-full mb-3 p-2 border rounded"
                />

                <label className="block mb-3 text-gray-700 font-semibold">Choose a Time Slot</label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {timeSlots.map((slot) => {
                    const isBooked = bookedSlots.includes(slot) && slot !== currentBooking.booking_time;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setNewTime(slot)}
                        className={`flex items-center justify-center gap-2 border rounded-lg py-2 text-sm transition
                          ${isBooked
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : newTime === slot
                            ? "bg-pink-500 text-white border-pink-500"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                          }`}
                      >
                        ⏰ {slot} {isBooked && "❌"}
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
                    className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded hover:scale-105 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowRescheduleModal(false)}
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
                      onClick={() => setReason(r)}
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

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleCancel(reason === "Other" ? reasonCustom : reason)}
                    className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded hover:scale-105 transition"
                  >
                    Confirm Cancel
                  </button>
                  
                  <button
                    onClick={() => setShowCancelModal(false)}
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
                <h2 className="text-gray-800 text-lg font-bold mb-4">Leave Feedback</h2>

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
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Your feedback..."
                  className="w-full p-2 border rounded text-gray-700 mb-4"
                  rows={4}
                />

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleSubmitFeedback}
                    className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded hover:scale-105 transition"
                  >
                    Submit Feedback
                  </button>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
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
        <ToastContainer position="top-center" />
      </div>
    </div>
  );
}
