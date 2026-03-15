"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const totalPrice = searchParams.get("totalPrice");

  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    // Simulate the payment process (replace with real payment gateway logic)
    const paymentSuccessful = true; // Simulate payment success

    if (paymentSuccessful) {
      // Send request to backend to confirm booking
      try {
        const res = await fetch(`http://localhost:5001/bookings/${bookingId}/confirm`, {
          method: "PATCH", // or POST, based on your backend design
          headers: {

            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          setPaymentStatus("Payment successful ✅ Booking confirmed!");
        } else {
          setPaymentStatus("Payment failed. Please try again.");
        }
      } catch (error) {
        console.error("Error confirming booking:", error);
        setPaymentStatus("Error during payment confirmation.");
      }
    } else {
      setPaymentStatus("Payment failed. Please try again.");
    }


    setLoading(false);
  };

  useEffect(() => {
    if (!bookingId || !totalPrice) {
      setPaymentStatus("Invalid payment details");
    }
  }, [bookingId, totalPrice]);

  return (
    <div className="min-h-screen bg-[#fff7fa]">
      <Sidebar />
      <div className="flex flex-col min-h-screen md:ml-64">
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
            Payment
          </h1>
          <div className="max-w-7xl mx-auto flex flex-col items-center justify-center">
            <p>Booking ID: {bookingId}</p>
            <p>Total Price: Rs. {totalPrice}</p>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="mt-6 px-6 py-2 text-white rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
            >
              {loading ? "Processing..." : "Complete Payment"}
            </button>

            {paymentStatus && (
              <div className="mt-6 text-center text-lg font-semibold text-gray-700">
                {paymentStatus}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}