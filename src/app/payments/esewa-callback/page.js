"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function EsewaCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Processing payment...");
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Check if we have base64 encoded data in query params (v2 API)
        const dataParam = searchParams.get("data");

        let refId, pid, amt, bookingIds;

        if (dataParam) {
          // Decode base64 data from v2 API
          try {
            const decodedData = JSON.parse(atob(dataParam));
            refId = decodedData.transaction_code;
            pid = decodedData.transaction_uuid;
            amt = decodedData.total_amount;
            // bookingIds will come from localStorage
          } catch (decodeError) {
            console.error("Failed to decode eSewa response:", decodeError);
            setStatus("❌ Invalid payment response from eSewa");
            setIsVerifying(false);
            return;
          }
        } else {
          // Fallback to v1 API query parameters
          refId = searchParams.get("refId");
          pid = searchParams.get("pid") || searchParams.get("txnId");
          amt = searchParams.get("amt") || searchParams.get("total_amount");
          bookingIds = searchParams.get("bookingIds");
        }

        // Get pending transaction from localStorage
        const pendingTxn = JSON.parse(
          localStorage.getItem("pendingTransaction") || "{}"
        );

        if (!refId || !pid) {
          setStatus("❌ Payment verification failed - missing required eSewa parameters");
          setIsVerifying(false);
          return;
        }

        const paymentAmount = amt || pendingTxn.amount;

        // Verify payment with backend
        const verifyResponse = await fetch("/api/payments/verify-esewa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refId,
            txnId: pid,
            amount: paymentAmount,
            bookingIds: bookingIds || pendingTxn.bookingIds?.join(","),
          }),
        });

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok) {
          setStatus(
            `❌ Payment verification failed: ${verifyData.message || "Unknown error"}`
          );
          setIsVerifying(false);
          return;
        }

        // Confirm bookings
        const confirmResponse = await fetch(
          "http://localhost:5001/bookings/confirm",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingIds: (bookingIds || pendingTxn.bookingIds)
                ?.split(",")
                .map(Number),
            }),
          }
        );

        if (!confirmResponse.ok) {
          setStatus("❌ Payment received but booking confirmation failed");
          setIsVerifying(false);
          return;
        }

        // Clear pending transaction
        localStorage.removeItem("pendingTransaction");

        setStatus("✅ Payment successful! Redirecting...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (error) {
        console.error("Payment verification error:", error);
        setStatus(`❌ Error: ${error.message}`);
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#fff7fa]">
      <Sidebar />
      <div className="flex flex-col min-h-screen md:ml-64">
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md text-center">
            {isVerifying && <p className="text-lg font-semibold mb-4">⏳ {status}</p>}
            {!isVerifying && <p className="text-lg font-semibold mb-4">{status}</p>}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
