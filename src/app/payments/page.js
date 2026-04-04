"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
 
  const bookingIdsParam = searchParams.get("bookingIds");
  const totalPrice = searchParams.get("totalPrice");

  const bookingIds = bookingIdsParam
    ? bookingIdsParam.split(",").map((id) => Number(id))
    : [];

  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
 
  const [userEmail, setUserEmail] = useState("");

  const handleEsewaPayment = async () => {
    if (!userEmail) {
      setPaymentStatus("⚠️ Please enter your email");
      return;
    }

    if (!bookingIds.length || !totalPrice) {
      setPaymentStatus("❌ Invalid booking details");
      return;
    }

    setLoading(true);
    setPaymentStatus(null);

    const transactionUuid = `TXN${Date.now()}`;
    const successUrl = `${window.location.origin}/payments/esewa-callback?bookingIds=${bookingIds.join(",")}&txnId=${transactionUuid}`;
    const failUrl = `${window.location.origin}/payments/payment-failed`;
 
    try {
      const signatureResponse = await fetch("/api/payments/esewa-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalPrice,
          transactionUUID: transactionUuid,
          productCode: process.env.NEXT_PUBLIC_ESEWA_MERCHANT_CODE || "EPAYTEST",
        }),
      });

      if (!signatureResponse.ok) {
        throw new Error("Failed to generate signature");
      }

      const { signature } = await signatureResponse.json();

      localStorage.setItem(
        "pendingTransaction",
        JSON.stringify({
          txnId: transactionUuid,
          bookingIds,
          amount: totalPrice,
          email: userEmail,
        })
      );
 
      const esewaData = {
        amount: totalPrice,
        tax_amount: 0,
        product_service_charge: 0,
        product_delivery_charge: 0,
        total_amount: totalPrice,
        transaction_uuid: transactionUuid,
        product_code: process.env.NEXT_PUBLIC_ESEWA_MERCHANT_CODE || "EPAYTEST",
        success_url: successUrl,
        failure_url: failUrl,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature: signature,
      };

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

      Object.entries(esewaData).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error("Signature generation error:", error);
      setPaymentStatus("❌ Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bookingIds.length || !totalPrice) {
      setPaymentStatus("❌ Invalid payment details");
    }
  }, [bookingIds, totalPrice]);

  return (
    <div className="min-h-screen bg-[#fff7fa]">
      <Sidebar />
      <div className="flex flex-col min-h-screen md:ml-64">
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
            Payment with eSewa
          </h1>

          <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md">
            <p className="text-sm mb-2">
              Booking IDs: {bookingIds.join(", ")}
            </p>
            <p className="text-lg font-semibold mb-4">
              Total Price: Rs. {totalPrice}
            </p>
 
            <input
              type="email"
              placeholder="Enter your email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full p-2 border mb-3 rounded"
            />
 
            <button
              onClick={handleEsewaPayment}
              disabled={loading}
              className="w-full mt-3 px-6 py-2 text-white rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 flex items-center justify-center gap-2"
            >
              {loading ? "Processing..." : "Pay with eSewa"}
            </button>
 
            {paymentStatus && (
              <div className="mt-4 text-center text-sm font-medium text-gray-700">
                {paymentStatus}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4 text-center">
              * Redirecting to eSewa Secure Payment Gateway
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}