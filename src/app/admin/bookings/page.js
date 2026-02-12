"use client";

import { useEffect, useState } from "react";
import AdminDashboardUI from "../../../components/AdminDashboardUI"; // Import the AdminDashboardUI component

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Only run on client after mount
  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("token");
    setToken(t);

    if (!t) {
      setLoading(false);
      return;
    }

    fetch("http://localhost:5001/admin/bookings", {
  headers: {
    Authorization: `Bearer ${t}`,
  },
})
  .then((res) => {
    if (!res.ok) {
      throw new Error("Unauthorized or failed request");
    }
    return res.json();
  })
  .then((data) => {
    setBookings(Array.isArray(data) ? data : []);
    setLoading(false);
  })
  .catch((err) => {
    console.error("Error fetching admin bookings:", err);
    setBookings([]);
    setLoading(false);
  });
    }, []);

  if (!mounted) return null;

  if (!token) {
    return <p className="p-6 text-red-500">You must be logged in as admin.</p>;
  }

  if (loading) {
    return <p className="p-6">Loading bookings...</p>;
  }

  if (bookings.length === 0) {
    return <p className="p-6">No bookings found.</p>;
  }

  return (
    <AdminDashboardUI> {/* Wrap the content with AdminDashboardUI */}
      <div className="p-8 min-h-screen bg-[#fff7fa]">
        <h1 className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
          Admin - Bookings
        </h1>

        <div className="overflow-x-auto shadow-lg rounded-lg scrollbar-thin scrollbar-thumb-pink-300 scrollbar-track-pink-100">
          <table className="min-w-full bg-white rounded-lg border border-gray-200">
            <thead className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
              <tr>
                <th className="py-3 px-5 text-left">ID</th>
                <th className="py-3 px-5 text-left">User</th>
                <th className="py-3 px-5 text-left">Service</th>
                <th className="py-3 px-5 text-left">Date</th>
                <th className="py-3 px-5 text-left">Time</th>
                <th className="py-3 px-5 text-left">Notes</th>
                <th className="py-3 px-5 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {bookings.map((b) => (
                <tr
                  key={b.id}
                  className="border-b hover:bg-pink-50 transition-colors duration-200"
                >
                  <td className="py-3 px-5 text-gray-700">{b.id}</td>
                  <td className="py-3 px-5 text-gray-800 font-medium">{b.user}</td>
                  <td className="py-3 px-5 text-gray-700">{b.service}</td>
                  <td className="py-3 px-5 text-gray-600">{b.booking_date}</td>
                  <td className="py-3 px-5 text-gray-600">{b.booking_time}</td>
                  <td className="py-3 px-5 text-gray-700">{b.notes || "-"}</td>
                  <td
                    className={`py-3 px-5 font-semibold capitalize ${
                      b.status === "pending"
                        ? "text-yellow-500"
                        : b.status === "confirmed"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {b.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminDashboardUI>
  );
}
