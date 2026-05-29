"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useEffect, useState } from "react";
import AdminSidebar from "../../../components/AdminSidebar";
import { clearAuthSession, getToken } from "@/lib/authStorage";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStatus, setActiveStatus] = useState("all");
  const bookingsPerPage = 10;
  const statusTabs = ["all", "upcoming", "completed", "missed", "cancelled"];
 
  useEffect(() => {
    setMounted(true);
    const t = getToken();
    setToken(t);

    if (!t) {
      setLoading(false);
      return;
    }

    fetchBookings(t);
  }, []);

  const sortedBookings = [...bookings].sort((a, b) => Number(b.id) - Number(a.id));
  const filteredBookings =
    activeStatus === "all"
      ? sortedBookings
      : sortedBookings.filter((booking) => booking.status === activeStatus);
  const bookingCounts = statusTabs.reduce((counts, status) => {
    counts[status] =
      status === "all"
        ? bookings.length
        : bookings.filter((booking) => booking.status === status).length;
    return counts;
  }, {});

  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;

  const currentBookings = filteredBookings.slice(
    indexOfFirstBooking,
    indexOfLastBooking
  );

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / bookingsPerPage));
  const showingStart = filteredBookings.length === 0 ? 0 : indexOfFirstBooking + 1;
  const showingEnd = Math.min(indexOfLastBooking, filteredBookings.length);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
 
  const fetchBookings = (authToken) => {
    fetch(apiUrl("/admin/bookings"), {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((res) => {
        if (res.status === 401) { 
          alert("Session expired. Please log in again.");
          clearAuthSession();
          window.location.href = "/login"; 
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch bookings");
        }

        return res.json();
      })
      .then((data) => {
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => Number(b.id) - Number(a.id))
          : [];
        setBookings(sorted);
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
 
    fetch(apiUrl(`/admin/bookings/${id}/status`), {
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

  const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : "-");
  const formatTime = (time) => time?.slice(0, 5) || "-";
  const getBookingTitle = (booking) =>
    booking.custom_service_names
      ? `Custom Services: ${booking.custom_service_names}`
      : booking.package || booking.service || "Service booking";
  const getBookingAmount = (booking) =>
    booking.custom_service_price || booking.package_price || booking.service_price || "0";
  const formatAmount = (booking) => {
    const amount = Number(getBookingAmount(booking));
    return Number.isFinite(amount) ? `Rs. ${amount.toFixed(2)}` : `Rs. ${getBookingAmount(booking)}`;
  };
  const getStatusBadgeClass = (status) => {
    if (status === "completed") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (status === "cancelled") return "bg-rose-50 text-rose-700 ring-rose-200";
    if (status === "missed") return "bg-amber-50 text-amber-700 ring-amber-200";
    return "bg-sky-50 text-sky-700 ring-sky-200";
  };
  const formatStatusLabel = (status) =>
    status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1);

  if (!mounted) return null;

  if (!token) {
    return <p className="p-6 text-red-500">You must be logged in as admin.</p>;
  }

  if (loading) {
    return <p className="p-6 text-gray-700">Loading bookings...</p>;
  }

  return (
    <AdminSidebar>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-600">Bookings</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">Booking Management</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Track appointments, review customer details, and update booking status.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="rounded-lg border border-slate-200 bg-white px-5 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{bookings.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-5 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Showing</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{filteredBookings.length}</p>
            </div>
          </div>
        </section>

        <div className="flex max-w-full gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          {statusTabs.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setActiveStatus(status);
                setCurrentPage(1);
              }}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold capitalize transition ${
                activeStatus === status
                  ? "bg-pink-50 text-pink-700 ring-1 ring-pink-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {formatStatusLabel(status)}
              <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                {bookingCounts[status]}
              </span>
            </button>
          ))}
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {currentBookings.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold text-slate-950">No bookings found</p>
              <p className="mt-2 text-sm text-slate-500">
                {activeStatus === "all"
                  ? "There are no bookings yet."
                  : `There are no ${activeStatus} bookings right now.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-pink-50 text-xs uppercase tracking-[0.12em] text-gray-700">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Booking</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Time</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentBookings.map((booking) => (
                    <tr key={booking.id} className="transition hover:bg-pink-50/40">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">{getBookingTitle(booking)}</p>
                        <p className="mt-1 text-xs text-slate-500">#{booking.id}</p>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700">{booking.user || "-"}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(booking.booking_date)}</td>
                      <td className="px-5 py-4 text-slate-600">{formatTime(booking.booking_time)}</td>
                      <td className="px-5 py-4 font-semibold text-emerald-700">{formatAmount(booking)}</td>
                      <td className="px-5 py-4">
                        {booking.status === "upcoming" ? (
                          <select
                            value={booking.status}
                            onChange={(event) => handleStatusChange(booking.id, event.target.value)}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                          >
                            <option value="upcoming">Upcoming</option>
                            <option value="completed">Completed</option>
                            <option value="missed">Missed</option>
                          </select>
                        ) : (
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${getStatusBadgeClass(booking.status)}`}>
                            {booking.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Showing {showingStart}-{showingEnd} of {filteredBookings.length} bookings
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">Booking details</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Booking #{selectedBooking.id}</h2>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${getStatusBadgeClass(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <DetailItem label="Customer" value={selectedBooking.user || "-"} />
                <DetailItem label="Booking" value={getBookingTitle(selectedBooking)} />
                <DetailItem label="Date" value={formatDate(selectedBooking.booking_date)} />
                <DetailItem label="Time" value={formatTime(selectedBooking.booking_time)} />
                <DetailItem label="Amount" value={formatAmount(selectedBooking)} emphasis />
                <DetailItem label="Status" value={selectedBooking.status || "-"} />
              </div>

              <div className="flex justify-end border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-md bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminSidebar>
  );
} 

function DetailItem({ label, value, emphasis = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${emphasis ? "text-emerald-700" : "text-slate-950"}`}>
        {value}
      </p>
    </div>
  );
}
