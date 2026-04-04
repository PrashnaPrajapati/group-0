"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function UserServicesPage() {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:5001/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(data);
        setFilteredServices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let temp = [...services];

    if (search.trim()) {
      temp = temp.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (genderFilter !== "all") {
      temp = temp.filter((s) => s.gender === genderFilter);
    }

    if (categoryFilter !== "all") {
      temp = temp.filter((s) => s.category === categoryFilter);
    }

    setFilteredServices(temp);
  }, [search, genderFilter, categoryFilter, services]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
 
      <div className="flex flex-col min-h-screen md:ml-64">
        <main className="flex-1 p-8">

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
              <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                Our Services
              </span>
            </h1>
            <p className="text-gray-600 font-bold mt-2 text-lg">
              Discover all our beauty treatments!!
            </p>
            <p className="text-gray-600 text-md mt-1">
              Book your favorite treatments and enjoy a pampering experience anytime.
            </p>
          </div>
 
          <div className="flex justify-center mb-8">
            <div className="flex bg-white border border-pink-200 rounded-full shadow-sm p-1">

              <button
                className="px-6 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-pink-500 to-purple-500 text-white"
              >
                Services
              </button>

              <button
                onClick={() => router.push("/packages")}
                className="px-6 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-black"
              >
                Packages
              </button>

            </div>
          </div>
 
          <div className="max-w-7xl mx-auto mb-8 bg-white p-6 rounded-xl shadow-sm border border-pink-200 flex flex-col md:flex-row gap-4">

            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 p-3 text-gray-700 placeholder-gray-400 border-2 border-pink-200 rounded focus:outline-none focus:ring-pink-200 focus:border-pink-500"
            />

            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="pp-3 text-gray-700 border-2 border-pink-200 rounded focus:outline-none focus:ring-pink-200 focus:border-pink-500"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-3 text-gray-700 border-2 border-pink-200 rounded focus:outline-none focus:ring-pink-200 focus:border-pink-500"
            >
              <option value="all">All Categories</option>
              <option value="hair">Hair</option>
              <option value="skin care">Skin Care</option>
              <option value="nails">Nails</option>
              <option value="makeup">Makeup</option>
              <option value="massage">Massage</option>
              <option value="body grooming">Body Grooming</option>
              <option value="spa">Spa</option>
            </select> 
          </div>
          
          <div className="mb-6 px-6">
         <p className="text-gray-600 font-bold text-xl bold mt-1">
            Explore our range of beauty services designed just for you.
         </p>
        </div> 
          {loading ? (
            <p className="text-center text-gray-500">Loading services...</p>
          ) : filteredServices.length === 0 ? (
            <p className="text-center text-gray-500">
              No services match your criteria
            </p>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(236,72,153,0.4),0_2px_4px_-1px_rgba(236,72,153,0.06)] border overflow-hidden"
                >
                  {service.image && (
                    <img
                      src={`http://localhost:5001${service.image}`}
                      alt={service.name}
                      className="w-full h-52 object-cover object-center"
                    />
                  )}
                  

                  <div className="p-6">

                    <div className="flex gap-2 mb-2 flex-wrap">
                      {service.gender && (
                        <span className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full">
                          {service.gender}
                        </span>
                      )}

                      {service.category && (
                        <span className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full">
                          {service.category}
                        </span>
                      )}
                    </div>

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
                      onClick={() => router.push(`/bookings?serviceId=${service.id}`)}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-2 rounded-full"
                    >
                      Book Now
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