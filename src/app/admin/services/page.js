"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch services
  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5001/admin/services", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching services", error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Toast confirmation helper
  const confirmWithToast = (message, onConfirm) => {
    toast.info(
      ({ closeToast }) => (
        <div>
          <p className="font-medium mb-3">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                onConfirm();
                closeToast();
              }}
              className="px-3 py-1 rounded bg-pink-500 text-white text-sm"
            >
              Yes
            </button>
            <button
              onClick={closeToast}
              className="px-3 py-1 rounded bg-gray-200 text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
      }
    );
  };

  // Toggle service status
  const toggleServiceStatus = (service) => {
    const action = service.status === "active" ? "inactive" : "active";

    confirmWithToast(
      `Are you sure you want to mark this service as ${action}?`,
      async () => {
        try {
          const res = await fetch(
            `http://localhost:5001/admin/services/${service.id}/${action}`,
            {
              method: "PUT",
              headers: {
                Authorization: "Bearer " + localStorage.getItem("token"),
              },
            }
          );

          if (!res.ok) {
            toast.error("Failed to update service status");
            return;
          }

          toast.success(
            `Service ${action === "active" ? "enabled" : "disabled"} successfully`
          );

          fetchServices();
        } catch {
          toast.error("Status update failed");
        }
      }
    );
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading services...</div>;
  }

  return (
    <div className="p-8 bg-[#fff7fa] min-h-screen">
      <ToastContainer position="top-center" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-pink-500">Admin – Services</h1>
        <button
          onClick={() => router.push("/admin/services/add")}
          className="text-white px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
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
                  <td className="p-4">
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
