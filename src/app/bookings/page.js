"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";


export default function BookingsPage() {
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]); // multiple services
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const [locationType, setLocationType] = useState(""); // "home" or "salon"
  const [address, setAddress] = useState(""); // only for home

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    fetch("http://localhost:5001/services")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setServices(data);
        } else {
          console.error("Services API did not return an array:", data);
          setServices([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load services", err);
        setServices([]);
      });
  }, []);

  const handleServiceClick = (id) => {
    const numId = Number(id);
    setSelectedServices((prev) =>
      prev.includes(numId)
        ? prev.filter((s) => s !== numId) // remove if already selected
        : [...prev, numId] // add if not selected
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Debug log to check values
    console.log({ selectedServices, date, time, locationType, address });

    // ✅ Validation: trim and ensure time is properly set
    if (
      selectedServices.length === 0 ||
      !date?.trim() ||
      !time?.trim() ||
      !locationType?.trim() ||
      (locationType === "home" && !address?.trim())
    ) {
      alert("Service, date, time, and location are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5001/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_ids: selectedServices,
          booking_date: date,
          booking_time: time,
          notes: notes.trim(),
          location_type: locationType,
          address: locationType === "home" ? address.trim() : "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Booking failed");
        return;
      }

      alert("Booking successful ✅");

      // Reset form
      setSelectedServices([]);
      setDate("");
      setTime("");
      setNotes("");
      setLocationType("");
      setAddress("");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const selectedServiceObjects = services.filter((s) =>
    selectedServices.includes(s.id)
  );

  const totalPrice = selectedServiceObjects.reduce(
    (sum, s) => sum + s.price,
    0
  );

  return (
  <div className="min-h-screen bg-[#fff7fa]">
    <Sidebar />

    {/* Right side content */}
    <div className="flex flex-col min-h-screen md:ml-64">
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
          Book Your Service
        </h1>

        <div className="max-w-7xl mx-auto flex gap-8 items-start">
          {/* LEFT SIDE – SERVICES */}
          <div className="w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                onClick={() => handleServiceClick(service.id)}
                className={`p-5 rounded-xl border cursor-pointer transition-all duration-300
                  ${
                    selectedServices.includes(service.id)
                      ? "border-pink-500 bg-gradient-to-r from-pink-100 to-purple-100 shadow-lg scale-[1.02]"
                      : "bg-white border-gray-200 hover:shadow-md hover:scale-[1.01]"
                  }`}
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  {service.name}
                </h3>

                <p className="text-sm text-gray-600 mb-3">
                  {service.description}
                </p>

                <div className="flex justify-between text-sm font-semibold text-pink-500">
                  <span>Rs. {service.price}</span>
                  <span>{service.duration}</span>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT SIDE – BOOKING FORM */}
          <form
            onSubmit={handleSubmit}
            className="w-1/3 bg-white p-6 rounded-xl shadow-lg sticky top-24"
          >
            <h2 className="text-xl font-semibold mb-3 text-gray-800">
              Selected Services
            </h2>

            {selectedServiceObjects.length > 0 ? (
              <ul className="mb-4 text-gray-600">
                {selectedServiceObjects.map((s) => (
                  <li key={s.id}>
                    {s.name} - Rs. {s.price}
                  </li>
                ))}
                <li className="font-semibold mt-2">
                  Total: Rs. {totalPrice}
                </li>
              </ul>
            ) : (
              <p className="mb-4 text-gray-600">
                Select services on the left
              </p>
            )}

            {/* Service Location */}
            <label className="block text-gray-700 mb-1">
              Service Location
            </label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="salon"
                  checked={locationType === "salon"}
                  onChange={(e) => setLocationType(e.target.value)}
                />
                Salon
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="home"
                  checked={locationType === "home"}
                  onChange={(e) => setLocationType(e.target.value)}
                />
                Home
              </label>
            </div>

            {locationType === "home" && (
              <>
                <label className="block text-gray-700 mb-1">
                  Your Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 text-gray-500 border rounded mb-4"
                  placeholder="Enter your home address"
                />
              </>
            )}

            <label className="block text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 text-gray-500 border rounded mb-4"
            />

            <label className="block text-gray-700 mb-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-2 text-gray-500 border rounded mb-4"
            />

            <label className="block text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 text-gray-500 border rounded mb-4"
              placeholder="Optional notes"
            />

            <button
              type="submit"
              disabled={
                loading ||
                selectedServices.length === 0 ||
                !date?.trim() ||
                !time?.trim() ||
                !locationType?.trim() ||
                (locationType === "home" && !address?.trim())
              }
              className="w-full py-2 text-white rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:scale-105 transition"
            >
              {loading ? "Booking..." : "Book Appointment"}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  </div>
);
}
