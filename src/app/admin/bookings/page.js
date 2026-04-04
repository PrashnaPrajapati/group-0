"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 10;
 
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

  const indexOfLastBooking = currentPage * bookingsPerPage;
const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;

const currentBookings = bookings.slice(
  indexOfFirstBooking,
  indexOfLastBooking
);

const totalPages = Math.ceil(bookings.length / bookingsPerPage);

const handleNextPage = () => {
  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
};

const handlePrevPage = () => {
  if (currentPage > 1) setCurrentPage(currentPage - 1);
};
 
  const fetchBookings = (authToken) => {
    fetch("http://localhost:5001/admin/bookings", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((res) => {
        if (res.status === 401) { 
          alert("Session expired. Please log in again.");
          localStorage.removeItem("token"); 
          window.location.href = "/login"; 
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
 
  const handleStatusChange = (id, newStatus) => {
    // Optimistically update the local state
    const updatedBookings = bookings.map((b) =>
      b.id === id ? { ...b, status: newStatus } : b
    );
    setBookings(updatedBookings);
 
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
          return res.text().then((text) => {
            try { 
              const errorData = JSON.parse(text);
              throw new Error(
                `Failed to update booking status: ${errorData.message || "Unknown error"}`
              );
            } catch (err) {  
              throw new Error(`Server error: ${text}`);
            }
          });
        } 
        fetchBookings(token);
      })
      .catch((err) => {
        console.error("Error updating status:", err);
        alert(`Failed to update status: ${err.message}`); 
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
    <AdminSidebar>
      <div className="p-8 min-h-screen bg-gray-50">
        <div className="text-center mb-6">
  <h1 className="text-3xl font-bold">
    <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
      Bookings Management
    </span>
  </h1>

  <p className="text-gray-500 mt-2">
    Track and manage all customer bookings efficiently
  </p>
  <p className="text-gray-500 text-md mt-1">
    View details, update statuses, and keep your schedule organized
  </p>
  
</div>

        <div className="overflow-x-auto shadow-[0_4px_6px_-1px_rgba(236,72,153,0.4),0_2px_4px_-1px_rgba(236,72,153,0.06)]">
          <table className="min-w-full bg-white rounded-lg text-gray-800">
            <thead className="bg-pink-50 text-gray-700">
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
              {currentBookings.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-gray-200 hover:bg-pink-50"
                >
                  <td className="py-3 px-5">{b.id}</td>
                  <td className="py-3 px-5 font-medium text-gray-900">
                    {b.user}
                  </td>
                  <td className="py-3 px-5">
  {b.package ? b.package : b.service}
</td>
                  <td className="py-3 px-5">
                    {formatDate(b.booking_date)}, {formatTime(b.booking_time)}
                  </td>

                  <td className="py-3 px-5">
  {b.status === 'upcoming' ? (
    <select
      value={b.status}
      onChange={(e) => handleStatusChange(b.id, e.target.value)}
      className="border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 text-blue-600 border-blue-200 focus:ring-blue-300"
    >
      <option value="upcoming">Upcoming</option>
      <option value="completed">Completed</option>
    </select>
  ) : (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
        b.status === 'completed'
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`}
    >
      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
    </span>
  )}
</td>

                  <td className="py-3 px-5 font-semibold text-green-600">
  {b.package_price || b.service_price || "0"}
</td>

                  <td className="py-3 px-5">
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="px-4 py-1 rounded text-white bg-gray-400 hover:bg-gray-500"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
 
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
                <span>{selectedBooking.service || selectedBooking.package}</span>

                <span className="font-semibold">Date:</span>
                <span>{formatDate(selectedBooking.booking_date)}</span>

                <span className="font-semibold">Time:</span>
                <span>{formatTime(selectedBooking.booking_time)}</span>

                <span className="font-semibold">Status:</span>
                <span className="capitalize">{selectedBooking.status}</span>

                <span className="font-semibold">Amount:</span>
                <span className="text-green-600 font-semibold">
                  {selectedBooking.service_price || selectedBooking.package_price || "0"}
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
        <div className="mt-6 flex justify-center gap-4">
  <button
    onClick={handlePrevPage}
    disabled={currentPage === 1}
    className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
  >
    Previous
  </button>

  <span className="px-4 py-2 text-gray-700">
    Page {currentPage} of {totalPages}
  </span>

  <button
    onClick={handleNextPage}
    disabled={currentPage === totalPages}
    className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
  >
    Next
  </button>
</div>
      </div>
      
    </AdminSidebar>
  );
} 