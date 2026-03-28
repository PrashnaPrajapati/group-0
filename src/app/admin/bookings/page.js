"use client";

import { useEffect, useState } from "react";
import AdminDashboardUI from "../../../components/AdminSidebar";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Fetch bookings initially and check for token
  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("token");
    setToken(t);

    if (!t) {
      setLoading(false);
      return;
    }

    fetchBookings(t);
  }, []);

  // Function to fetch all bookings
  const fetchBookings = (authToken) => {
    fetch("http://localhost:5001/admin/bookings", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((res) => {
        if (res.status === 401) {
          // Unauthorized, clear token and redirect to login
          alert("Session expired. Please log in again.");
          localStorage.removeItem("token"); // Remove invalid token
          window.location.href = "/login"; // Redirect to login page
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch bookings");
        }

        return res.json();
      })
      .then((data) => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching bookings:", err);
        setLoading(false);
      });
  };

  // Handle status change and update both frontend and backend
  const handleStatusChange = (id, newStatus) => {
    // Optimistically update the local state
    const updatedBookings = bookings.map((b) =>
      b.id === id ? { ...b, status: newStatus } : b
    );
    setBookings(updatedBookings);

    // Update the status in the backend
    fetch(`http://localhost:5001/admin/bookings/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => {
        if (!res.ok) {
          // If response is not OK, check if it's HTML (error page)
          return res.text().then((text) => {
            try {
              // Try to parse it as JSON
              const errorData = JSON.parse(text);
              throw new Error(
                `Failed to update booking status: ${errorData.message || "Unknown error"}`
              );
            } catch (err) {
              // If parsing fails, assume it's an HTML error page
              throw new Error(`Server error: ${text}`);
            }
          });
        }

        // Refetch bookings after a successful update to sync with the server
        fetchBookings(token);
      })
      .catch((err) => {
        console.error("Error updating status:", err);
        // Optionally provide more detailed feedback to the user
        alert(`Failed to update status: ${err.message}`);
        // Revert to the previous state if there's an error
        setBookings(bookings);
      });
  };

  const formatDate = (date) => new Date(date).toLocaleDateString();
  const formatTime = (time) => time?.slice(0, 5);

  if (!mounted) return null;

  if (!token) {
    return <p className="p-6 text-red-500">You must be logged in as admin.</p>;
  }

  if (loading) {
    return <p className="p-6 text-gray-700">Loading bookings...</p>;
  }

  return (
    <AdminDashboardUI>
      <div className="p-8 min-h-screen bg-[#fff7fa]">
        <h1 className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
          Manage Bookings
        </h1>

        <div className="overflow-x-auto shadow-md rounded-lg border border-pink-200">
          <table className="min-w-full bg-white rounded-lg border border-pink-200 text-gray-800">
            <thead className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
              <tr>
                <th className="py-3 px-5 text-left">ID</th>
                <th className="py-3 px-5 text-left">Customer</th>
                <th className="py-3 px-5 text-left">Service</th>
                <th className="py-3 px-5 text-left">Date & Time</th>
                <th className="py-3 px-5 text-left">Status</th>
                <th className="py-3 px-5 text-left">Amount</th>
                <th className="py-3 px-5 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {bookings.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-pink-200 hover:bg-pink-50"
                >
                  <td className="py-3 px-5">{b.id}</td>
                  <td className="py-3 px-5 font-medium text-gray-900">
                    {b.user}
                  </td>
                  <td className="py-3 px-5">{b.service}</td>
                  <td className="py-3 px-5">
                    {formatDate(b.booking_date)}, {formatTime(b.booking_time)}
                  </td>

                  <td className="py-3 px-5">
                    <select
                      value={b.status}
                      onChange={(e) =>
                        handleStatusChange(b.id, e.target.value)
                      }
                      className={`border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 ${
                        b.status === "upcoming"
                          ? "text-blue-600 border-blue-200 focus:ring-blue-300"
                          : b.status === "completed"
                          ? "text-green-600 border-green-200 focus:ring-green-300"
                          : "text-red-600 border-red-200 focus:ring-red-300"
                      }`}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="completed">Completed</option> 
                    </select>
                  </td>

                  <td className="py-3 px-5 font-semibold text-green-600">
                    {b.price || "0"}
                  </td>

                  <td className="py-3 px-5">
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="px-4 py-1 rounded text-white bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* POPUP MODAL WITH BACKDROP BLUR */}
        {selectedBooking && (
          <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-8 rounded-lg shadow-xl w-[420px] text-gray-800 border border-pink-200">
              <h2 className="text-2xl font-bold mb-6 text-purple-600 text-center">
                Booking Details
              </h2>

              <h3 className="text-lg text-gray-800 mb-4">
                View the details of the selected booking:
              </h3>

              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <span className="font-semibold">ID:</span>
                <span>{selectedBooking.id}</span>

                <span className="font-semibold">Customer:</span>
                <span>{selectedBooking.user}</span>

                <span className="font-semibold">Service:</span>
                <span>{selectedBooking.service}</span>

                <span className="font-semibold">Date:</span>
                <span>{formatDate(selectedBooking.booking_date)}</span>

                <span className="font-semibold">Time:</span>
                <span>{formatTime(selectedBooking.booking_time)}</span>

                <span className="font-semibold">Status:</span>
                <span className="capitalize">{selectedBooking.status}</span>

                <span className="font-semibold">Amount:</span>
                <span className="text-green-600 font-semibold">
                  {selectedBooking.price || "0"}
                </span>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="mt-8 w-full text-white py-2 rounded bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminDashboardUI>
  );
} 