"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import AdminSidebar from "@/components/AdminSidebar";
import "react-toastify/dist/ReactToastify.css";

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const servicesPerPage = 10;
  const router = useRouter();
 
  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("token"); 
      const res = await fetch("http://localhost:5001/admin/services", {
        headers: { Authorization: `Bearer ${token}` },
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

  const indexOfLastService = currentPage * servicesPerPage;
  const indexOfFirstService = indexOfLastService - servicesPerPage;
  const currentServices = services.slice(indexOfFirstService, indexOfLastService);
  const totalPages = Math.ceil(services.length / servicesPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

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
      { autoClose: false, closeOnClick: false }
    );
  };
 
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
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

  if (loading)
    return <div className="p-10 text-center text-gray-500">Loading services...</div>;
 
  return (
    <div className="flex min-h-screen bg-gray-50"> {/* Full height and light background */}
      <AdminSidebar /> {/* Sidebar */}

      <main className="flex-1 p-8"> {/* Main content flex-1 */}
        <ToastContainer position="top-center" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            ← Back
          </button>

          <div className="text-center mb-6">
  <h1 className="text-3xl font-bold">
    <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
      Service Management
    </span>
  </h1>

  <p className="text-gray-500 mt-2">
    Manage all services efficiently from one place
  </p>
  <p className="text-gray-500 text-md mt-1">
    Easily add new services, update details, control status, and ensure everything runs smoothly
  </p>
  
</div>
          

          <button
            onClick={() => router.push("/admin/services/add")}
            className="text-white px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
          >
            + Add Service
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(236,72,153,0.4),0_2px_4px_-1px_rgba(236,72,153,0.06)] border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-pink-50 text-gray-700">
              <tr>
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Category</th>
                <th className="p-4 text-left">Price</th>
                <th className="p-4 text-left">Duration</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentServices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-500">
                    No services found
                  </td>
                </tr>
              ) : (
                currentServices.map((service) => (
                  <tr key={service.id} className="border-t">
                    <td className="p-4 text-gray-900 font-medium">{service.id}</td>
                    <td className="p-4 text-gray-900 font-medium">{service.name}</td>
                    <td className="p-4 text-gray-900 font-medium">{service.category}</td>
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
                        onClick={() => router.push(`/admin/services/edit/${service.id}`)}
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

        {/* Pagination */}
        <div className="mt-4 flex justify-center gap-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
} 