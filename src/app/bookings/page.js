"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getToken } from "@/lib/authStorage";
 
export default function BookingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const serviceIdFromQuery = Number(searchParams.get("serviceId") || 0);
  const packageIdFromQuery = Number(searchParams.get("packageId") || 0);

  const [isOpen, setIsOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);

  const [bookingType, setBookingType] = useState(
    packageIdFromQuery ? "package" : "service"
  ); 
  const [selectedServices, setSelectedServices] = useState(
    serviceIdFromQuery ? [serviceIdFromQuery] : []
  );
  const [selectedPackage, setSelectedPackage] = useState(
    packageIdFromQuery || null
  );

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [locationType, setLocationType] = useState(""); 
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const token = getToken();

  const timeSlots = ["09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00","18:00"];
 
  useEffect(() => {
    fetch("http://localhost:5001/services")
      .then((res) => res.json())
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]));

    fetch("http://localhost:5001/packages")
      .then((res) => res.json())
      .then((data) => setPackages(Array.isArray(data) ? data : []))
      .catch(() => setPackages([]));
  }, []);
 
  useEffect(() => {
    if (!date) return;

    fetch(`http://localhost:5001/bookings/booked-slots?date=${date}`)
      .then((res) => res.json())
      .then((data) => setBookedSlots(data))
      .catch(() => setBookedSlots([]));
  }, [date]);

  const handleServiceClick = (id) => {
    if (serviceIdFromQuery && id === serviceIdFromQuery) return;
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handlePackageClick = (id) => {
  if(packageIdFromQuery) return; 
  setSelectedPackage(id === selectedPackage ? null : id);
};

  const handleSubmit = async (e) => {
  e.preventDefault();
  setErrorMessage("");

  if (!token) return setErrorMessage("You must be logged in to book a service!");
  if (
    (bookingType === "service" && selectedServices.length === 0) ||
    (bookingType === "package" && !selectedPackage) ||
    !date?.trim() ||
    !time?.trim() ||
    !locationType?.trim() ||
    (locationType === "home" && !address?.trim())
  )
    return setErrorMessage("Please fill all required fields");

  setLoading(true);

  try {
    const requestBody = {
  package_id: bookingType === "package" ? selectedPackage : null,
  service_ids:
    bookingType === "service"
      ? selectedServices.map(Number)
      : selectedPackageObject?.services.map((s) => s.id) || [],
  booking_date: date,
  booking_time: time,
  location_type: locationType,
  address: locationType === "home" ? address.trim() : "",
  notes: notes.trim(),
};

    const res = await fetch("http://localhost:5001/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();
    if (!res.ok) return setErrorMessage(data.message || "Booking failed");

    // Redirect to payments with booking IDs and total price
    const bookingIds = data.bookingIds || [data.bookingId];
    router.push(`/payments?bookingIds=${bookingIds.join(',')}&totalPrice=${totalPrice}`);

 
 
    setSelectedServices(serviceIdFromQuery ? [serviceIdFromQuery] : []);
    setSelectedPackage(null);
    setDate("");
    setTime("");
    setNotes("");
    setLocationType("");
    setAddress("");
  } catch (err) {
    console.error(err);
    setErrorMessage("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
}; 
  const selectedServiceObjects = services.filter((s) =>
    selectedServices.includes(s.id)
  );
  const selectedPackageObject = packages.find((p) => p.id === selectedPackage);

  const totalPrice =
    bookingType === "service"
      ? selectedServiceObjects.reduce((sum, s) => sum + Number(s.price), 0)
      : selectedPackageObject?.price || 0;

  const totalDuration =
    bookingType === "service"
      ? selectedServiceObjects.reduce(
          (sum, s) => sum + Number(String(s.duration).replace(/\D/g, "")),
          0
        )
      : selectedPackageObject?.services.reduce(
          (sum, s) => sum + Number(String(s.duration).replace(/\D/g, "")),
          0
        ) || 0;
 
  const today = new Date();
  const selectedDate = new Date(date);
  const filteredTimeSlots = timeSlots.filter((slot) => {
    if (!date) return true;
    if (
      selectedDate.toDateString() === today.toDateString() &&
      Number(slot.split(":")[0]) < today.getHours()
    )
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <div className={`flex flex-col min-h-screen ${isOpen ? "md:ml-70" : "pl-16 md:pl-8"}`}>
      <Navbar />
      <div className="flex flex-col min-h-screen pt-20">
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
            Book Your Appointment
          </h1>

          <div className="max-w-7xl mx-auto flex gap-6 items-start justify-center"> 
            <div className="w-2/6"> 
              <div className="mb-4 flex gap-4">
                <button
                    onClick={() => !packageIdFromQuery && setBookingType("service")}
                    className={`px-4 py-2 rounded ${
                      bookingType === "service"
                        ? "bg-pink-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    Services
                  </button>
                  <button
                    onClick={() => !packageIdFromQuery && setBookingType("package")}
                    className={`px-4 py-2 rounded ${
                      bookingType === "package"
                        ? "bg-pink-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                  Packages
                </button>
              
              </div> 
              <div className="grid grid-cols-1 gap-6">
                {bookingType === "service" &&
                  services
                    .filter((s) =>
                      serviceIdFromQuery ? s.id === serviceIdFromQuery : true
                    )
                    .map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleServiceClick(s.id)}
                        className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 ${
                          selectedServices.includes(s.id)
                            ? "border-pink-500 bg-gradient-to-r from-pink-100 to-purple-100 shadow-lg scale-[1.02]"
                            : "bg-white border-gray-200 hover:shadow-md hover:scale-[1.01]"
                        }`}
                      >
                        <img
                          src={`http://localhost:5001${s.image}`}
                          alt={s.name}
                          className="w-full h-36 object-cover rounded mb-3"
                        />
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">{s.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{s.description}</p>
                        <div className="flex justify-between text-sm font-semibold text-pink-500">
                          <span>Rs. {Number(s.price).toFixed(2)}</span>
                          <span>{String(s.duration).replace(/\D/g, "")} mins</span>
                        </div>
                      </div>
                    ))}

                {bookingType === "package" &&
                  packages
                  .filter(p => packageIdFromQuery ? p.id === packageIdFromQuery : true)
                  .map((p) => (
                  <div
                    key={p.id}
                    onClick={() => !packageIdFromQuery && handlePackageClick(p.id)}
                    className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 ${
                      selectedPackage === p.id
                        ? "border-pink-500 bg-gradient-to-r from-pink-100 to-purple-100 shadow-lg scale-[1.02]"
                        : "bg-white border-gray-200 hover:shadow-md hover:scale-[1.01]"
                    }`}
                  >
                    <img
                          src={
                            p.image && p.image.startsWith("/")
                              ? `http://localhost:5001${p.image}`
                              : `http://localhost:5001/uploads/packages/${p.image}`
                          }
                          alt={p.name}
                          className="w-full h-36 object-cover rounded mb-3"
                        />

                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{p.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{p.description}</p>
                    <div className="flex justify-between text-sm font-semibold text-pink-500">
                      <span>Rs. {Number(p.price).toFixed(2)}</span>
                      <span>{p.services.length} services</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
 
            <div className="w-2/6 bg-white p-6 rounded-xl shadow-lg sticky top-24">
              {errorMessage && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{errorMessage}</div>
              )}

              <h2 className="text-xl font-semibold mb-6 text-gray-800">
                {bookingType === "service" ? "Selected Services" : "Selected Package"}
              </h2>

              {bookingType === "service" ? (
                selectedServiceObjects.length > 0 ? (
                  <ul className="mb-6 text-gray-700 space-y-1">
                    {selectedServiceObjects.map((s) => (
                      <li key={s.id} className="flex justify-between">
                        <span>{s.name}</span>
                        <span>Rs. {Number(s.price).toFixed(2)}</span>
                      </li>
                    ))}
                    <li className="font-semibold flex justify-between pt-2 border-t border-gray-300">
                      <span>Total:</span>
                      <span>Rs. {totalPrice.toFixed(2)}</span>
                    </li>
                  </ul>
                ) : (
                  <p className="mb-6 text-gray-500">No service selected</p>
                )
              ) : selectedPackageObject ? (
                <ul className="mb-6 text-gray-700 space-y-1">
                  <li className="flex justify-between">
                    <span>{selectedPackageObject.name}</span>
                    <span>Rs. {Number(selectedPackageObject.price).toFixed(2)}</span>
                  </li>

                  <li className="font-semibold flex justify-between pt-2 border-t border-gray-300">
                    <span>Total:</span>
                    <span>Rs. {Number(selectedPackageObject.price).toFixed(2)}</span>
                  </li>
                </ul>
              ) : (
                <p className="mb-6 text-gray-500">No package selected</p>
              )}

              <form>
                <fieldset className="mb-6">
                  <legend className="mb-2 font-semibold text-gray-800">Service Location</legend>
                  <label className="flex items-center gap-2 text-gray-800 mb-2">
                    <input
                      type="radio"
                      value="salon"
                      checked={locationType === "salon"}
                      onChange={(e) => setLocationType(e.target.value)}
                      className="w-4 h-4 accent-pink-500"
                    />
                    Visit Salon
                  </label>

                  <label className="flex items-center gap-2 text-gray-800">
                    <input
                      type="radio"
                      value="home"
                      checked={locationType === "home"}
                      onChange={(e) => setLocationType(e.target.value)}
                      className="w-4 h-4 accent-pink-500"
                    />
                    Home Service
                  </label>
                </fieldset>

                {locationType === "home" && (
                  <div className="mb-6">
                    <label className="block mb-1 text-gray-700">Enter your location</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your home address"
                      className="w-full p-2 border border-gray-300 rounded text-gray-700"
                    />
                  </div>
                )}

                <div className="mb-6">
                  <label className="block mb-1 text-gray-700">Select Date</label>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-gray-700"
                  />
                </div>
 
                <div className="mb-6">
                  <label className="block mb-3 text-gray-700 font-semibold">Choose a Time Slot</label>
                  <div className="grid grid-cols-4 gap-3">
                    {filteredTimeSlots.map((slot) => {
                      const isBooked = bookedSlots.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setTime(slot)}
                          className={`flex items-center justify-center gap-2 border rounded-lg py-3 text-sm transition
                            ${
                              isBooked
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : time === slot
                                ? "bg-pink-500 text-white border-pink-500"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                            }`}
                        >
                          ⏰ {slot} {isBooked && "❌"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-gray-700">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="w-full p-2 border border-gray-300 rounded text-gray-700"
                    rows={3}
                  />
                </div>
              </form>
            </div>
 
            <form
              onSubmit={handleSubmit}
              className="w-2/6 bg-white p-6 rounded-xl shadow-lg sticky top-24"
            >
              <h2 className="text-xl font-semibold mb-6 text-gray-800">Booking Summary</h2>

              <div className="text-gray-700 space-y-3 mb-6">
                <div className="flex justify-between">
                  <span>Service / Package</span>
                  <span className="font-semibold">
                    {bookingType === "service"
                      ? selectedServiceObjects.length > 0
                        ? selectedServiceObjects.map((s) => s.name).join(", ")
                        : "-"
                      : selectedPackageObject
                      ? selectedPackageObject.name
                      : "-"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Duration</span>
                  <span className="font-semibold">{totalDuration} mins</span>
                </div>

                <div className="flex justify-between">
                  <span>Date</span>
                  <span className="font-semibold">{date || "-"}</span>
                </div>

                <div className="flex justify-between">
                  <span>Time</span>
                  <span className="font-semibold">{time || "-"}</span>
                </div>

                <div className="flex justify-between">
                  <span>Location</span>
                  <span className="font-semibold">
                    {locationType === "home"
                      ? "Home"
                      : locationType === "salon"
                      ? "Salon"
                      : "-"}
                  </span>
                </div>
              </div>

              <hr className="mb-6 border-gray-300" />

              {/* Total Price */}
              <div className="flex justify-between text-lg font-bold text-pink-500 mb-6">
                <span>Total</span>
                <span>
              Rs.{" "}
              {bookingType === "service"
                ? totalPrice.toFixed(2)
                : selectedPackageObject
                ? Number(selectedPackageObject.price).toFixed(2)
                : "0.00"}
            </span>
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  (bookingType === "service" && selectedServices.length === 0) ||
                  (bookingType === "package" && !selectedPackage) ||
                  !date?.trim() ||
                  !time?.trim() ||
                  !locationType?.trim() ||
                  (locationType === "home" && !address?.trim())
                }
                className="w-full py-2 text-white rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:scale-105 transition"
              >
                {loading ? "Booking..." : "Confirm Booking"}
              </button>
            </form>
          </div>
        </main> 
        <Footer />
      </div>
    </div>
    </div>
  );
} 