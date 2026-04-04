"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function PackageDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;

    async function fetchPackage() {
      try {
        const res = await fetch(`http://localhost:5001/packages/${params.id}`);
        if (!res.ok) throw new Error("Package not found");
        const data = await res.json();

        if (typeof data.services === "string") {
          data.services = JSON.parse(data.services);
        }

        setPkg(data);
      } catch (err) {
        console.error(err);
        alert("Failed to load package details");
        router.back();
      } finally {
        setLoading(false);
      }
    }

    fetchPackage();
  }, [params?.id, router]);

  if (loading)
    return <p className="text-center mt-10">Loading package details...</p>;
  if (!pkg) return <p className="text-center mt-10">Package not found</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col min-h-screen md:ml-64">
        <main className="flex-1 p-8 max-w-5xl mx-auto">

          <button
            onClick={() => router.back()}
            className="mt-6 px-4 py-2 bg-gray-400 rounded hover:bg-gray-300 transition"
          >
            Back to Packages
          </button>

          <h1 className="text-3xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
            {pkg.name} - Details
          </h1>
 
          {pkg.image && (
            <img
              src={`http://localhost:5001/uploads/packages/${pkg.image}`}
              alt={pkg.name}
              className="h-64 max-w-2xl object-cover rounded mb-6 block mx-auto shadow-sm"
            />
          )}

          <p className="text-gray-700 text-lg font-medium mb-6">{pkg.description}</p>

          <p className="text-pink-500 text-2xl font-bold mb-6">Included Services in this package </p>
 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pkg.services?.map((s) => (
              <div
                key={s.id}
                className="border rounded p-4 bg-white flex flex-col shadow-[0_4px_6px_-1px_rgba(236,72,153,0.4),0_2px_4px_-1px_rgba(236,72,153,0.06)] hover:shadow-lg transition-shadow duration-300"
              > 
                {s.image ? (
                  <img
                    src={`http://localhost:5001${s.image}`}
                    alt={s.name}
                    className="w-full h-40 object-cover rounded mb-3"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-200 rounded mb-3 flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}

                <h3 className="font-semibold text-lg text-gray-800">
                  {s.name}
                </h3>

                <p className="text-gray-600 mb-2">{s.description}</p> 
              </div>
            ))}
          </div>
 
          <div className="mt-6 text-right font-semibold text-pink-500 text-lg">
            Total: Rs. {pkg.price}
          </div>

          <div className="flex justify-center mt-4">

          <button
            onClick={() => router.push(`/bookings?packageId=${pkg.id}`)}
            className="mt-4 w-full md:w-auto px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full hover:from-pink-600 hover:to-purple-600 transition"
          >
            Book an Appointment
          </button>
          </div> 
        </main>
        <Footer />
      </div>
    </div>
  );
}

