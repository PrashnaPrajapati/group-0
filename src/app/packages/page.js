"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function BookPackagePage() {
  const router = useRouter();

  const [tab, setTab] = useState("packages"); 
  const [packages, setPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
 
  useEffect(() => {
    if (tab === "packages") {
      fetch("http://localhost:5001/packages")
        .then((res) => res.json())
        .then((data) => {
          setPackages(data);
          setFilteredPackages(data);
        })
        .catch((err) => console.error(err));
    }
  }, [tab]);
 
  useEffect(() => {
    if (tab === "services") {
      router.push("/services");
    }
  }, [tab, router]);
 
  useEffect(() => {
    if (!search.trim()) {
      setFilteredPackages(packages);
    } else {
      const filtered = packages.filter((pkg) =>
        pkg.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredPackages(filtered);
    }
    setCurrentPage(1);
  }, [search, packages]);

  const totalPages = Math.max(
  1,
  Math.ceil(filteredPackages.length / itemsPerPage)
);

const startIndex = (currentPage - 1) * itemsPerPage;

const currentPackages = filteredPackages.slice(
  startIndex,
  startIndex + itemsPerPage
);

useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-col min-h-screen pt-20">
        <main className="flex-1 p-8">

          <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
            <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Our Packages
            </span>
          </h1>
          <p className="text-gray-600 font-bold mt-2 text-lg">
              Discover curated beauty packages for the ultimate pampering.
            </p>
            <p className="text-gray-600 text-md mt-1">
              Combined multiple services for a complete experience.
            </p>
          </div>
 
          <div className="flex justify-center mb-6">
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
            <div className="max-w-6xl mx-auto mb-6">
              <input
                type="text"
                placeholder="Search packages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-3 text-gray-700 placeholder-gray-400 border-2 border-pink-200 rounded focus:outline-none focus:border-pink-500"
              />
            </div>
          )}

          <div className="mb-6 px-6">
         <p className="text-gray-600 font-bold text-xl bold mt-1">
            Enjoy convenience, value, and relaxation - all in one package.
         </p>
        </div>
 
          {tab === "packages" && (
            <>
            <div className="max-w-8xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPackages.length === 0 ? (
                <p className="text-center text-gray-500 col-span-full">
                  No packages match your search
                </p>
              ) : (
                currentPackages.map((pkg) => (
                  <div
                      key={pkg.id}
                      className="p-5 rounded-xl border bg-white shadow-[0_4px_6px_-1px_rgba(236,72,153,0.4),0_2px_4px_-1px_rgba(236,72,153,0.06)] hover:shadow-lg transition-all duration-300 flex flex-col"
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
                      Total: Rs. {pkg.price}
                    </div>
                    <button
                      onClick={() => router.push(`/packages/details/${pkg.id}`)}
                      className="mt-auto py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full hover:scale-105 transition"
                    >
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-center items-center gap-3 mt-10">
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.max(p - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-400 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>

                <span className="font-medium text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-400 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </main>
        <Footer />
        
      </div>
    </div>
    </div>
  );
}