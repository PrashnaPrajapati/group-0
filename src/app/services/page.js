"use client";

import { useEffect, useState } from "react";

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch("http://localhost:5001/services");
      const data = await res.json();
      setServices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-center mt-20">Loading services...</p>;
  }

  return (
    <div className="min-h-screen bg-pink-50 p-8">
      <h1 className="text-3xl font-bold text-center text-pink-600 mb-10">
        Our Services
      </h1>

      <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {services.map((service) => (
          <div
            key={service._id}
            className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition"
          >
            <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
            <p className="text-gray-600 mb-2">
              Duration: {service.duration} mins
            </p>
            <p className="text-pink-600 font-bold text-lg mb-4">
              ₹{service.price}
            </p>

            <button className="w-full bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700">
              Book Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
