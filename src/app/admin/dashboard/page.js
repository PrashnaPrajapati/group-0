"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import AdminSidebar from "@/components/AdminSidebar";
import "react-toastify/dist/ReactToastify.css";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("services");

  // Add service form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
    gender: "",
    category: "",
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const servicesPerPage = 10;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) return router.replace("/login");
    if (role !== "admin") return router.replace("/dashboard");

    fetchDashboard();
    fetchServices();
  }, [router]);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");

      const resStats = await fetch("http://localhost:5001/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const statsData = await resStats.json();

      const resBookings = await fetch(
        "http://localhost:5001/admin/bookings?limit=5&sort=desc",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const bookingsData = await resBookings.json();

      setStats(statsData);
      setBookings(bookingsData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/admin/services", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

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

  // Add Service handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.name || !form.price || !form.duration || !form.gender || !form.category) {
      setFormError("Please fill all required fields");
      return;
    }

    setFormLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("price", form.price);
      formData.append("duration", form.duration);
      formData.append("gender", form.gender);
      formData.append("category", form.category);
      if (image) formData.append("image", image);

      const res = await fetch("http://localhost:5001/admin/services", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message || "Failed to add service");
        return;
      }

      toast.success("Service added successfully ✅", { position: "top-center" });
      setShowAddForm(false);
      setForm({ name: "", description: "", price: "", duration: "", gender: "", category: "" });
      setImage(null);
      setPreview(null);
      fetchServices();
    } catch (err) {
      console.error(err);
      setFormError("Something went wrong");
    } finally {
      setFormLoading(false);
    }
  };

  const monthlyData = [
    
  ];

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading dashboard...</div>;
  }

  return (
    <AdminSidebar>
      <ToastContainer position="top-center" />
      <div className="p-8 bg-[#fff7fa] min-h-screen space-y-10 relative">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <p className="text-gray-500">Total Services</p>
            <p className="text-3xl font-bold text-pink-500">{stats?.totalServices || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <p className="text-gray-500">Total Packages</p>
            <p className="text-3xl font-bold text-pink-500">{stats?.totalPackages || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <p className="text-gray-500">Total Bookings</p>
            <p className="text-3xl font-bold text-pink-500">{stats?.totalBookings || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <p className="text-gray-500">Total Users</p>
            <p className="text-3xl font-bold text-pink-500">{stats?.totalUsers || 0}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="font-semibold mb-4">Monthly Bookings</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="bookings" stroke="#ec4899" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="font-semibold mb-4">Revenue</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="bg-gray-400  rounded-full p-2 flex max-w-3xl">
            {["services", "packages", "bookings", "feedback"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-full transition ${
                  activeTab === tab ? "bg-white shadow" : "hover:bg-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="mt-6 bg-white rounded-xl shadow p-6 relative">
            {/* Services Tab */}
            {activeTab === "services" && (
              <div className="relative">
                {/* Blur and disable interaction of background content when form is open */}
                <div className={showAddForm ? "blur-sm pointer-events-none select-none" : ""}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                      Manage Services
                    </h3>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="text-white px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                    >
                      {showAddForm ? "Cancel" : "+ Add Service"}
                    </button>
                  </div>

                  {servicesLoading ? (
                    <p className="text-center text-gray-500">Loading services...</p>
                  ) : (
                    <>
                      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-pink-50 text-gray-700">
                            <tr>
                              <th className="p-4 text-left">ID</th>
                              <th className="p-4 text-left">Service Name</th>
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
                                <td colSpan="7" className="p-6 text-center text-gray-500">
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
                    </>
                  )}
                </div>

                {/* Add Service Form (inside the page, not fullscreen) */}
                {showAddForm && (
                  <div className="absolute top-0 left-0 right-0 bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto z-20 mt-2 border border-pink-300">
                    {formError && (
                      <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">{formError}</div>
                    )}
                    <form onSubmit={handleAddService} className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-900 mb-1">Service Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          className="w-full border-2 border-gray-200 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-900 mb-1">Description</label>
                        <textarea
                          name="description"
                          value={form.description}
                          onChange={handleChange}
                          rows="3"
                          className="w-full border-2 border-gray-200 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-900 mb-1">Price (Rs.) *</label>
                        <input
                          type="number"
                          name="price"
                          value={form.price}
                          onChange={handleChange}
                          className="w-full border-2 border-gray-200 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-900 mb-1">Duration *</label>
                        <input
                          type="text"
                          name="duration"
                          value={form.duration}
                          onChange={handleChange}
                          className="w-full border-2 border-gray-200 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-900 mb-1">Gender *</label>
                        <select
                          name="gender"
                          value={form.gender}
                          onChange={handleChange}
                          className="w-full border-2 border-gray-200 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-500"
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="all">All</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-900 mb-1">Category *</label>
                        <select
                          name="category"
                          value={form.category}
                          onChange={handleChange}
                          className="w-full border-2 border-gray-200 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-500"
                        >
                          <option value="">Select Category</option>
                          <option value="hair">Hair</option>
                          <option value="skin care">Skin Care</option>
                          <option value="nails">Nails</option>
                          <option value="makeup">Makeup</option>
                          <option value="massage">Massage</option>
                          <option value="body grooming">Body Grooming</option>
                          <option value="spa">Spa</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-900 mb-1">Image</label>
                        <div className="flex items-center space-x-4">
                          <input
                            type="file"
                            accept="image/*"
                            id="serviceImage"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="serviceImage"
                            className="cursor-pointer px-4 py-2 bg-pink-400 text-white rounded hover:bg-pink-600"
                          >
                            {image ? "Change Image" : "Choose Image"}
                          </label>
                          {image && <span className="text-gray-700">{image.name}</span>}
                        </div>
                        {preview && (
                          <img src={preview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />
                        )}
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={formLoading}
                          className="px-6 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white disabled:opacity-50"
                        >
                          {formLoading ? "Saving..." : "Add Service"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminSidebar>
  );
} 