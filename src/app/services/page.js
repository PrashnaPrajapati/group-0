"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function UserServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:5001/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  
  return (
    <div className="min-h-screen bg-[#fff7fa]">
      <Sidebar />

      {/* Right side content */}
      <div className="flex flex-col min-h-screen md:ml-64">
        <main className="flex-1 p-8">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500 mb-8 text-center">
            Our Beauty Services
          </h1>

          {loading ? (
            <p className="text-center text-gray-500">Loading services...</p>
          ) : services.length === 0 ? (
            <p className="text-center text-gray-500">
              No services available at the moment
            </p>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-xl shadow-sm border overflow-hidden"
                >
                  <div className="p-6">
                    <h3 className="font-semibold text-lg text-gray-800 mb-1">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {service.description}
                    </p>

                    <div className="flex justify-between items-center mb-4">
                      <span className="text-pink-500 font-semibold">
                        Rs. {service.price}
                      </span>
                      <span className="text-xs text-gray-400">
                        {service.duration}
                      </span>
                    </div>

                    <button
                      onClick={() => router.push("/bookings")}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-2 rounded-full"
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
