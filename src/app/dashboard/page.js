"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  User,
  Edit,
  X,
  Phone,
  Mail,
  MapPin as MapIcon,
} from "lucide-react";

const bookings = [
  {
    id: "B001",
    service: "Bridal Makeup",
    status: "Upcoming",
    date: "2025-12-05",
    time: "10:00 AM",
    location: "Kathmandu",
    beautician: "Priya Sharma",
    price: 5000,
  },
  {
    id: "B002",
    service: "Hair Styling",
    status: "Completed",
    date: "2025-11-15",
    time: "02:00 PM",
    location: "Patan Durbar Square, Lalitpur",
    beautician: "Anita Koirala",
    price: 2500,
  },
  {
    id: "B003",
    service: "Nail Art",
    status: "Cancelled",
    date: "2025-11-20",
    time: "11:00 AM",
    location: "Bhaktapur",
    beautician: "Reena Gurung",
    price: 1500,
  },
];

const statusColors = {
  Upcoming: "bg-blue-100 text-blue-600",
  Completed: "bg-green-100 text-green-600",
  Cancelled: "bg-red-100 text-red-600",
};

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    const token = localStorage.getItem("token"); 
    if (!token) {
      router.replace("/login"); 
    } else {
      setLoading(false); 
    }
  }, [router]);

  if (loading) return null; 

  const filteredBookings = bookings.filter((b) => b.status === activeTab);

  return (
    <div className="min-h-screen flex bg-[#faf7fb] text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#f1e9f7] p-8 hidden md:flex flex-col gap-10">
        <nav className="flex flex-col gap-6 text-lg font-semibold">
          {[
            "Dashboard",
            "Services",
            "Bookings",
            "Chat",
            "Reviews",
            "Payments",
            "Profile",
          ].map((item) => (
            <a
              key={item}
              href="#"
              className={`cursor-pointer ${
                item === "Dashboard" ? "text-pink-500" : "text-black"
              } hover:text-pink-500 transition-colors`}
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-[#f8e9fb] p-6 border-b border-pink-200">
          <h1 className="text-pink-500 font-extrabold text-3xl mb-2 flex items-center gap-2">
            <span className="text-pink-400 text-3xl">✨</span> Singar Glow
          </h1>
          <div>
            <h2 className="font-semibold text-gray-900">Good Morning.</h2>
            <p className="text-gray-600 text-sm">Sunday, November 22, 2025</p>
            <p className="mt-1 text-gray-700">
              Manage your bookings and appointments
            </p>
          </div>
        </header>

        {/* Tabs */}
        <nav className="flex gap-12 px-6 mt-6 border-b border-pink-200">
          {["Upcoming", "Completed", "Cancelled"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 font-medium text-sm ${
                activeTab === tab
                  ? "text-pink-500 after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-pink-500"
                  : "text-gray-600 hover:text-pink-500"
              }`}
            >
              {tab} Bookings
            </button>
          ))}
        </nav>

        {/* Bookings Grid */}
        <section className="flex-1 overflow-auto p-6">
          {filteredBookings.length === 0 ? (
            <p className="text-center text-gray-400 mt-16">
              No {activeTab.toLowerCase()} bookings found.
            </p>
          ) : (
            <div className="grid gap-6 max-w-4xl mx-auto">
              {filteredBookings.map((booking) => (
                <article
                  key={booking.id}
                  className="bg-white rounded-xl p-6 shadow-md border border-pink-100"
                >
                  <header className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-lg">{booking.service}</h3>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        statusColors[booking.status]
                      }`}
                    >
                      {booking.status}
                    </span>
                  </header>
                  <p className="text-xs text-gray-500 mb-4">
                    Booking ID: {booking.id}
                  </p>

                  <ul className="space-y-3 text-gray-700 text-sm">
                    <li className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-pink-400" />
                      <span>
                        {booking.date} at {booking.time}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-pink-400" />
                      <span>{booking.location}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <User className="w-4 h-4 text-pink-400" />
                      <span>Beautician: {booking.beautician}</span>
                    </li>
                  </ul>

                  <div className="border-t border-pink-100 mt-6 pt-4 flex justify-between items-center">
                    <span className="font-semibold">Total Amount</span>
                    <span className="text-pink-600 font-bold">{booking.price}</span>
                  </div>

                  {booking.status === "Upcoming" && (
                    <div className="flex gap-4 mt-4">
                      <button className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition">
                        <Edit className="w-4 h-4" />
                        Reschedule
                      </button>
                      <button className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-100 transition">
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="bg-[#f8e9fb] border-t border-pink-200 py-10 px-12 mt-auto text-gray-700 text-sm">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-pink-500 font-bold mb-2 flex items-center gap-2 text-lg">
                <span className="text-pink-400 text-2xl">✨</span> Singar Glow
              </h3>
              <p>
                Your trusted partner for premium beauty services at home or
                salon.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Quick Links</h4>
              <ul className="space-y-1">
                <li className="hover:text-pink-500 cursor-pointer">Services</li>
                <li className="hover:text-pink-500 cursor-pointer">My Bookings</li>
                <li className="hover:text-pink-500 cursor-pointer">Login</li>
                <li className="hover:text-pink-500 cursor-pointer">Sign Up</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Services</h4>
              <ul className="space-y-1">
                <li className="hover:text-pink-500 cursor-pointer">Makeup</li>
                <li className="hover:text-pink-500 cursor-pointer">Hair Styling</li>
                <li className="hover:text-pink-500 cursor-pointer">Massage</li>
                <li className="hover:text-pink-500 cursor-pointer">Nails</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Contact Us</h4>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-pink-400" /> +977 98012 34567
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-pink-400" /> hello@singarglow.com
                </li>
                <li className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-pink-400" /> Kathmandu, Nepal
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center text-gray-400 border-t border-pink-200 pt-4">
            © 2025 Singar Glow. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  );
}
