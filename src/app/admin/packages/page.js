"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminPackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const packagesPerPage = 10;

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchPackages = async () => {
    try {
      const res = await fetch("http://localhost:5001/admin/packages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPackages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);
 
  const indexOfLastPackage = currentPage * packagesPerPage;
  const indexOfFirstPackage = indexOfLastPackage - packagesPerPage;
  const currentPackages = packages.slice(indexOfFirstPackage, indexOfLastPackage);
  const totalPages = Math.ceil(packages.length / packagesPerPage);

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

  const togglePackageStatus = (pkg) => {
    const action = pkg.status === "active" ? "inactive" : "active";

    confirmWithToast(
      `Are you sure you want to mark this package as ${action}?`,
      async () => {
        try {
          const res = await fetch(
            `http://localhost:5001/packages/${pkg.id}/${action}`,
            {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!res.ok) {
            toast.error("Failed to update package status");
            return;
          }

          toast.success(
            `Package ${action === "active" ? "enabled" : "disabled"} successfully`
          );

          fetchPackages();
        } catch {
          toast.error("Status update failed");
        }
      }
    );
  };

  if (loading)
    return <div className="p-10 text-center text-gray-500">Loading packages...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <ToastContainer position="top-center" />
 
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
                  Package Management
                </span>
              </h1>

              <p className="text-gray-500 mt-2">
                Manage all available packages in one place
              </p>
              <p className="text-gray-500 text-md mt-1">
                Add new packages, update details, control pricing, duration, and linked services efficiently
              </p>
              
            </div>

          <button
            onClick={() => router.push("/admin/packages/add")}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white"
          >
            + Add Package
          </button>
        </div>
 
        <div className="bg-white shadow-[0_4px_6px_-1px_rgba(236,72,153,0.4),0_2px_4px_-1px_rgba(236,72,153,0.06)] rounded-xl overflow-x-auto border">
          <table className="w-full text-sm">
            <thead className="bg-pink-50 text-gray-700">
              <tr>
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Price</th>
                <th className="p-4 text-left">Duration</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Services</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentPackages.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-500">No packages found</td>
                </tr>
              ) : (
                currentPackages.map((pkg) => (
                  <tr key={pkg.id} className="border-t">
                    <td className="p-4 font-medium text-gray-900">{pkg.id}</td>
                    <td className="p-4 font-medium text-gray-900">{pkg.name}</td>
                    <td className="p-4 font-medium text-gray-900">Rs. {pkg.price}</td>
                    <td className="p-4 font-medium text-gray-900">
                      {pkg.duration || "N/A"}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-sm font-medium ${
                        pkg.status === "active"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-200 text-gray-500"
                      }`}>
                        {pkg.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700">
                      {pkg.services.map((s) => s.name).join(", ")}
                    </td>
                    <td className="p-4 text-center space-x-2">
                      <button
                        onClick={() => router.push(`/admin/packages/edit/${pkg.id}`)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => togglePackageStatus(pkg)}
                        className={`px-3 py-1 rounded ${
                          pkg.status === "active"
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "bg-green-100 text-green-600 hover:bg-green-200"
                        }`}
                      >
                        {pkg.status === "active" ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
 
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