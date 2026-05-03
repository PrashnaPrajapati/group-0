"use client";

import { apiUrl } from "@/lib/apiConfig";
import { getValidToken } from "@/lib/authStorage";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

function decodeEsewaData(dataParam) {
  if (!dataParam) return null;

  const normalized = dataParam
    .replace(/ /g, "+")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(dataParam.length / 4) * 4, "=");

  try {
    return JSON.parse(atob(normalized));
  } catch {
    try {
      return JSON.parse(atob(decodeURIComponent(normalized)));
    } catch {
      try {
        return JSON.parse(decodeURIComponent(dataParam));
      } catch {
        return null;
      }
    }
  }
}

function getEsewaDataParam(searchParams) {
  const dataParam = searchParams.get("data");
  if (dataParam) return dataParam;

  if (typeof window === "undefined") return null;

  const [, embeddedData] = window.location.href.split("?data=");
  return embeddedData ? embeddedData.split("&")[0] : null;
}

function EsewaCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Processing payment...");
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const dataParam = getEsewaDataParam(searchParams);
        const decodedData = decodeEsewaData(dataParam);
        const pendingTxn = JSON.parse(
          localStorage.getItem("pendingTransaction") || "{}"
        );

        if (dataParam && (!decodedData || typeof decodedData !== "object")) {
          console.error("eSewa data param is not valid JSON:", dataParam);
          setStatus("Invalid payment response from eSewa.");
          setIsVerifying(false);
          return;
        }

        const transactionCode =
          decodedData?.transaction_code ||
          searchParams.get("transaction_code") ||
          searchParams.get("refId") ||
          searchParams.get("rid") ||
          searchParams.get("oid");

        const txnId =
          decodedData?.transaction_uuid ||
          searchParams.get("transaction_uuid") ||
          searchParams.get("txnId") ||
          searchParams.get("pid") ||
          pendingTxn.txnId;

        const amount =
          decodedData?.total_amount ||
          searchParams.get("total_amount") ||
          searchParams.get("amt") ||
          searchParams.get("amount") ||
          pendingTxn.amount;

        const urlBookingIds = searchParams.get("bookingIds");
        const storedBookingIds =
          pendingTxn.bookingIds ||
          (urlBookingIds
            ? urlBookingIds
                .split(",")
                .map((id) => Number(id.trim()))
                .filter(Boolean)
            : []);

        console.log("eSewa callback params", {
          decodedData,
          transactionCode,
          txnId,
          amount,
          storedBookingIds,
        });

        if (!txnId || !amount) {
          setStatus("Payment verification failed. Missing transaction details from eSewa.");
          setIsVerifying(false);
          return;
        }

        if (!storedBookingIds || storedBookingIds.length === 0) {
          setStatus("Payment session expired or booking data is missing. Please contact support.");
          setIsVerifying(false);
          return;
        }

        const verifyResponse = await fetch("/api/payments/verify-esewa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callbackData: decodedData,
            transactionCode,
            txnId,
            amount,
            bookingIds: storedBookingIds.join(","),
          }),
        });

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok) {
          setStatus(
            `Payment verification failed: ${verifyData.message || "Unknown error"}`
          );
          setIsVerifying(false);
          return;
        }

        const token = getValidToken();
        if (!token) {
          setStatus(
            "Payment received, but your login session expired. Please log in and contact support with your transaction ID."
          );
          setIsVerifying(false);
          return;
        }

        const confirmResponse = await fetch(apiUrl("/bookings/confirm"), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bookingIds: storedBookingIds,
          }),
        });

        if (!confirmResponse.ok) {
          setStatus("Payment received, but booking confirmation failed.");
          setIsVerifying(false);
          return;
        }

        localStorage.removeItem("pendingTransaction");
        setStatus("Payment successful. Redirecting...");

        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (error) {
        console.error("Payment verification error:", error);
        setStatus(`Error: ${error.message}`);
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#fff7fa]">
      <Sidebar />
      <div className="flex min-h-screen flex-col md:ml-64">
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="mx-auto max-w-md rounded-xl bg-white p-6 text-center shadow-md">
            <p className="mb-4 text-lg font-semibold text-gray-800">
              {isVerifying ? "Verifying payment..." : status}
            </p>
            {isVerifying && <p className="text-sm text-gray-500">{status}</p>}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function EsewaCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fff7fa]" />}>
      <EsewaCallbackContent />
    </Suspense>
  );
}
