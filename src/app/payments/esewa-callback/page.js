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
        const dataParam = searchParams.get("data"); 
        let refId, pid, amt, bookingIds;

        if (dataParam) { 
          let decodedData = null;
          try {
            decodedData = JSON.parse(atob(dataParam));
          } catch (firstError) {
            try {
              decodedData = JSON.parse(decodeURIComponent(dataParam));
            } catch (secondError) {
              console.error("Failed to decode eSewa response:", firstError, secondError);
            }
          }

          if (!decodedData || typeof decodedData !== "object") {
            console.error("eSewa data param is not valid JSON:", dataParam);
            setStatus("❌ Invalid payment response from eSewa");
            setIsVerifying(false);
            return;
          }

          refId = decodedData.transaction_code || decodedData.rid || decodedData.refId || decodedData.ref_id || decodedData.transaction_id || decodedData.oid;
          pid = decodedData.transaction_uuid || decodedData.pid || decodedData.txnId || decodedData.txn_id || decodedData.txn || decodedData.transaction_code;
          amt = decodedData.total_amount || decodedData.amt || decodedData.amount;
          bookingIds = decodedData.bookingIds || decodedData.booking_ids || decodedData.bookingIdsString || decodedData.booking_ids_str;
        } else { 
          refId = searchParams.get("refId") || searchParams.get("rid") || searchParams.get("oid") || searchParams.get("transaction_id");
          pid = searchParams.get("pid") || searchParams.get("txnId") || searchParams.get("txn_id");
          amt = searchParams.get("amt") || searchParams.get("total_amount") || searchParams.get("amount");
          bookingIds = searchParams.get("bookingIds");
        } 
 
        const pendingTxn = JSON.parse(
          localStorage.getItem("pendingTransaction") || "{}"
        );

        if (!refId || !pid) {
          setStatus("❌ Payment verification failed - missing required eSewa parameters");
          setIsVerifying(false);
          return;
        }

        const storedBookingIds = pendingTxn.bookingIds || bookingIds?.split(",").map(Number);
        const paymentAmount = amt || pendingTxn.amount;

        console.log("eSewa callback params", {
          dataParam,
          refId,
          pid,
          amt,
          bookingIds,
          pendingTxn,
          storedBookingIds,
          paymentAmount,
        });

        if (!storedBookingIds || storedBookingIds.length === 0 || !paymentAmount) {
          setStatus("❌ Payment session expired or booking data is missing. Please try again.");
          setIsVerifying(false);
          return;
        }
 
        const verifyResponse = await fetch("/api/payments/verify-esewa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refId,
            txnId: pid,
            amount: paymentAmount,
            bookingIds: storedBookingIds.join(","),
          }),
        });

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok) {
          setStatus(
            `❌ Payment verification failed: ${verifyData.message || "Unknown error"}${verifyData.detail ? ` (${verifyData.detail})` : ""}`
          );
          setIsVerifying(false);
          return;
        }
 
        const confirmResponse = await fetch(
          "http://localhost:5001/bookings/confirm",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingIds: pendingTxn.bookingIds,
            }),
          }
        );

        if (!confirmResponse.ok) {
          setStatus("❌ Payment received but booking confirmation failed");
          setIsVerifying(false);
          return;
        }
 
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
