"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function BookPackagePage() {
  const router = useRouter();

  const [tab, setTab] = useState("packages"); 
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    if (tab === "packages") {
      fetch("http://localhost:5001/packages")
        .then((res) => res.json())
        .then((data) => setPackages(data))
        .catch((err) => console.error(err));
    }
  }, [tab]);

  useEffect(() => {
    if (tab === "services") {
      router.push("/services");
    }
  }, [tab, router]);

  return (
    <div className="min-h-screen bg-[#fff7fa]">
      <Sidebar />
      <div className="flex flex-col min-h-screen md:ml-64">
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
            Packages
          </h1>

          {/* TAB SWITCHER */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-white border border-pink-200 rounded-full shadow-sm p-1">
              <button
                onClick={() => setTab("services")}
                className={`px-6 py-2 rounded-full text-sm font-medium ${
                  tab === "services"
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Services
              </button>
              <button
                onClick={() => setTab("packages")}
                className={`px-6 py-2 rounded-full text-sm font-medium ${
                  tab === "packages"
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Packages
              </button>
            </div>
          </div>

          {tab === "packages" && (
            <div className="max-w-8xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-5 rounded-xl border bg-white hover:shadow-md transition-all duration-300 flex flex-col"
                >
                  {pkg.image && (
                    <img
                      src={`http://localhost:5001/uploads/packages/${pkg.image}`}
                      alt={pkg.name}
                      className="w-full h-40 object-cover rounded-t-xl mb-4"
                    />
                  )}
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">{pkg.name}</h3>
                  <h3 className="text-sm text-gray-600 mb-2">{pkg.description}</h3>
                  <p className="text-lg font-bold text-gray-600 mb-3">
                    Includes {pkg.services.length} service{pkg.services.length > 1 ? "s" : ""}
                  </p>
                  <div className="text-sg font-bold text-pink-500 mb-4">
                    Total: Rs. {pkg.services.reduce((sum, s) => sum + s.price, 0)}
                  </div>
                  <button
                    onClick={() => router.push(`/packages/details/${pkg.id}`)}
                    className="mt-auto py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full hover:scale-105 transition"
                  >
                    View Details
                  </button>
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