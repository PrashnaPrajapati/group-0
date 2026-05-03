"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

function PaymentFailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingPayment, setPendingPayment] = useState(null);

  const bookingIds = useMemo(() => {
    const ids = searchParams.get("bookingIds");
    return ids
      ? ids
          .split(",")
          .map((id) => Number(id.trim()))
          .filter(Boolean)
      : [];
  }, [searchParams]);

  useEffect(() => {
    const storedPayment = JSON.parse(localStorage.getItem("pendingTransaction") || "{}");
    setPendingPayment(storedPayment);
  }, []);

  const totalPrice = searchParams.get("totalPrice") || pendingPayment?.amount;
  const canRetryPayment = bookingIds.length > 0 && Boolean(totalPrice);

  const handleRetry = () => {
    if (canRetryPayment) {
      router.push(`/payments?bookingIds=${bookingIds.join(",")}&totalPrice=${totalPrice}`);
      return;
    }

    router.push("/services");
  };

  return (
    <div className="min-h-screen bg-[#fff7fa]">
      <Sidebar />
      <div className="flex min-h-screen flex-col md:ml-64">
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="mx-auto max-w-md rounded-xl bg-white p-6 text-center shadow-md">
            <div className="mb-4 text-4xl text-red-500">X</div>
            <h2 className="mb-4 text-2xl font-bold text-red-600">Payment Failed</h2>
            <p className="mb-3 text-gray-600">
              Your payment with eSewa was not completed. Please try again.
            </p>
            <p className="mb-6 text-sm text-gray-500">
              Your booking is still pending until payment is completed.
            </p>
            <button
              onClick={handleRetry}
              className="w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-2 text-white hover:opacity-90"
            >
              {canRetryPayment ? "Retry eSewa Payment" : "Return to Services"}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fff7fa]" />}>
      <PaymentFailedContent />
    </Suspense>
  );
}
