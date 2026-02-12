"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function UserDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("token");
    setToken(t);

    if (!t) {
      setLoading(false);
      return;
    }

    fetch("http://localhost:5001/bookings/my", {
      headers: {
        Authorization: `Bearer ${t}`,
      },
    })
      .then(async (res) => {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          console.log("API Response:", data);

          // Group bookings by ID to combine services and calculate total amount
          const groupedBookings = data.reduce((acc, booking) => {
            const existingBooking = acc.find(b => b.id === booking.id);
            if (existingBooking) {
              existingBooking.services.push({
                name: booking.service,
                price: booking.price
              });
              existingBooking.total_amount += booking.price;
            } else {
              acc.push({
                id: booking.id,
                booking_date: booking.booking_date,
                booking_time: booking.booking_time,
                status: booking.status,
                address: booking.address,
                services: [{
                  name: booking.service,
                  price: booking.price,
                }],
                total_amount: booking.price,
              });
            }
            return acc;
          }, []);

          setBookings(groupedBookings);  // Set grouped bookings state
        } catch (e) {
          console.error("API did not return JSON:", text);
          setBookings([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setBookings([]);
        setLoading(false);
      });
  }, []);

  if (!mounted) return null;
  if (!token) return <p className="p-6 text-red-500">You must be logged in.</p>;

  const filteredBookings = bookings.filter(
    (b) => b.status.toLowerCase() === activeTab
  );

  return (
    <div className="min-h-screen bg-[#fff7fa]">
      <Sidebar />

      {/* Right side content */}
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
                className={`pb-2 font-semibold transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-pink-500 text-pink-500"
                    : "text-gray-500 hover:text-pink-500"
                } capitalize`}
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
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition relative"
                >
                  <span
                    className={`absolute top-3 right-3 px-3 py-1 text-sm font-semibold rounded-full ${
                      b.status === "upcoming"
                        ? "bg-blue-100 text-blue-600"
                        : b.status === "completed"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  </span>

                  <h2 className="text-lg font-semibold text-gray-800 mb-1">
                    {b.services.map((service) => service.name).join(", ")} {/* Display all services */}
                  </h2>

                  <p className="text-gray-500 text-sm mb-2">Booking ID: {b.id}</p>

                  <div className="text-gray-600 text-sm space-y-1 mb-4">
                    <p>
                      <strong className="mr-1">📅 Date & Time:</strong>
                      {b.booking_date} at {b.booking_time}
                    </p>
                    <p>
                      <strong className="mr-1">📍 Location:</strong>
                      {b.address || "Salon"}
                    </p>
                    <p className="font-semibold text-pink-500">
                      Total Amount: ₹{b.total_amount} {/* Show total amount */}
                    </p>
                  </div>

                  {b.status === "upcoming" && (
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 px-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded hover:scale-105 transition">
                        Reschedule
                      </button>
                      <button className="flex-1 py-2 px-3 bg-red-100 text-red-600 rounded hover:scale-105 transition">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
