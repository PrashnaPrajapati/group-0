"use client";

import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function PaymentFailedPage() {
  const router = useRouter();

  const handleRetry = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#fff7fa]">
      <Sidebar />
      <div className="flex flex-col min-h-screen md:ml-64">
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md text-center">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Payment Failed
            </h2>
            <p className="text-gray-600 mb-6">
              Your payment with eSewa was not completed. Please try again.
            </p>
            <button
              onClick={handleRetry}
              className="w-full px-6 py-2 text-white rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
            >
              Return to Dashboard
            </button>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
