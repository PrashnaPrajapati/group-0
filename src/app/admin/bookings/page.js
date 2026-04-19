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
      <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-pink-500 font-semibold">Admin Dashboard</p>
            <h1 className="mt-3 text-4xl font-extrabold text-slate-900">Bookings Management</h1>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
              Track and manage customer bookings with a clean, responsive view. Use the cards below to review booking details and update statuses quickly.
            </p>
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Total bookings</p>
              <p className="text-2xl font-semibold text-slate-900">{bookings.length}</p>
            </div>
            <div className="rounded-full bg-white border border-slate-200 px-4 py-2 text-sm text-slate-600 shadow-sm">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </div>
          </div>

          {currentBookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-900">No bookings found</p>
              <p className="mt-2 text-slate-500">Check again later or refresh to load the latest bookings.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
            {currentBookings.map((b) => (
              <div
                key={b.id}
                className="group overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Booking #{b.id}</p>
                    <h2 className="mt-3 text-lg font-semibold text-slate-900">{b.package || b.service || "Service booking"}</h2>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    b.status === "completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : b.status === "cancelled"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-sky-100 text-sky-700"
                  }`}>
                    {b.status?.charAt(0).toUpperCase() + b.status?.slice(1)}
                  </span>
                </div>

                <div className="mt-6 space-y-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="font-medium text-slate-800">Customer</span>
                    <span className="text-right font-semibold text-slate-900">{b.user}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Date</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(b.booking_date)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Time</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{formatTime(b.booking_time)}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Amount</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-700">{b.package_price || b.service_price || "0"}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => setSelectedBooking(b)}
                    className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    View details
                  </button>
                  {b.status === "upcoming" && (
                    <select
                      value={b.status}
                      onChange={(e) => handleStatusChange(b.id, e.target.value)}
                      className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none sm:w-auto"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="completed">Completed</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}

        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Booking details</p>
                    <h2 className="mt-2 text-3xl font-bold text-slate-900">#{selectedBooking.id}</h2>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
                    selectedBooking.status === "completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : selectedBooking.status === "cancelled"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-sky-100 text-sky-700"
                  }`}>
                    {selectedBooking.status?.charAt(0).toUpperCase() + selectedBooking.status?.slice(1)}
                  </span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Customer</p>
                    <p className="mt-3 text-lg font-semibold text-slate-900">{selectedBooking.user}</p>
                    <p className="mt-1 text-sm text-slate-500">{selectedBooking.email || ""}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Booking</p>
                    <p className="mt-3 text-lg font-semibold text-slate-900">{selectedBooking.package || selectedBooking.service}</p>
                    <p className="mt-1 text-sm text-slate-500">{selectedBooking.booking_date} at {formatTime(selectedBooking.booking_time)}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Amount</p>
                    <p className="mt-3 text-2xl font-bold text-emerald-700">{selectedBooking.service_price || selectedBooking.package_price || "0"}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Status</p>
                    <p className="mt-3 text-lg font-semibold text-slate-900 capitalize">{selectedBooking.status}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Showing {currentBookings.length} of {bookings.length} bookings.</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
    </AdminSidebar>
  );
} 