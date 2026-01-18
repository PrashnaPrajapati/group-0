"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch services
  const fetchServices = async () => {
    try {
      const res = await fetch("http://localhost:5001/admin/services", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });

      const data = await res.json();
      setServices(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching services", error);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Replace deleteService with toggle status
const toggleServiceStatus = async (service) => {
  const action =
    service.status === "active" ? "inactive" : "active";

  if (
    !confirm(
      `Are you sure you want to mark this service as ${action}?`
    )
  )
    return;

  try {
    await fetch(
      `http://localhost:5001/admin/services/${service.id}/${action}`,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      }
    );

    fetchServices(); // refresh list
  } catch (error) {
    console.error("Status update failed", error);
  }
};


  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        Loading services...
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#fff7fa] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-pink-500">
          Admin – Services
        </h1>
        <button
          onClick={() => router.push("/admin/services/add")}
          className="bg-pink-500 text-white px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
        >
          + Add Service
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-pink-50 text-gray-700">
            <tr>
              <th className="p-4 text-left">ID</th>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Price</th>
              <th className="p-4 text-left">Duration</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-6 text-center text-gray-500">
                  No services found
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="border-t">
                  <td className="p-4 text-gray-900 font-medium">{service.id}</td>
                  <td className="p-4 text-gray-900 font-medium">{service.name}</td>
                  <td className="p-4 text-gray-900 font-medium">Rs. {service.price}</td>
                  <td className="p-4 text-gray-900 font-medium">{service.duration}</td>
                  <td className="p-4 text-gray-900 font-medium">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        service.status === "active"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {service.status}
                    </span>
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button
                      onClick={() =>
                        router.push(`/admin/services/edit/${service.id}`)
                      }
                      className="px-3 py-1 rounded bg-blue-100 text-blue-600 hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                    onClick={() => toggleServiceStatus(service)}
                    className={`px-3 py-1 rounded ${
                      service.status === "active"
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-green-100 text-green-600 hover:bg-green-200"
                    }`}
                  >
                    {service.status === "active" ? "Disable" : "Enable"}
                  </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
