"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AddPackagePage() {
  const router = useRouter();

  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [image, setImage] = useState(null); // new
  const [preview, setPreview] = useState(null); // new
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    fetch("http://localhost:5001/services")
      .then((res) => res.json())
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]));
  }, []);

  const handleServiceToggle = (id) => {
    const numId = Number(id);
    setSelectedServices((prev) =>
      prev.includes(numId)
        ? prev.filter((s) => s !== numId)
        : [...prev, numId]
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !price || !duration || selectedServices.length === 0) {
      setError("Name, price, duration, and at least one service are required.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("price", price);
      formData.append("duration", duration);
      formData.append("status", "active");
      formData.append("service_ids", JSON.stringify(selectedServices));
      if (image) formData.append("image", image);

      const res = await fetch("http://localhost:5001/admin/packages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to create package");
        setLoading(false);
        return;
      }

      toast.success("Package created successfully ✅");
      setTimeout(() => {
        router.push("/admin/packages");
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff7fa] flex">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <ToastContainer position="top-center" />

        <h1 className="text-2xl font-bold text-pink-500 mb-6">Add New Package</h1>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4">{error}</div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow-sm max-w-2xl space-y-4"
        >
          <div>
            <label className="block mb-1 font-medium text-black">Package Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border p-2 rounded text-black"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-black">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border p-2 rounded text-black"
              rows={3}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-black">Price (Rs.) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border p-2 rounded text-black"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-black">Duration (days) *</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full border p-2 rounded text-black"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block mb-1 font-medium text-black">Package Image</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                id="packageImage"
                onChange={handleImageChange}
                className="hidden"
              />
              <label
                htmlFor="packageImage"
                className="cursor-pointer px-4 py-2 bg-pink-400 text-white rounded hover:bg-pink-600"
              >
                {image ? "Change Image" : "Choose Image"}
              </label>
              {image && <span className="text-black">{image.name}</span>}
            </div>
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="mt-2 w-32 h-32 object-cover rounded"
              />
            )}
          </div>

          <div>
            <label className="block mb-2 font-medium text-black">Select Services *</label>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border p-2 rounded bg-white">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer text-black">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(s.id)}
                    onChange={() => handleServiceToggle(s.id)}
                  />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full"
          >
            {loading ? "Saving..." : "Add Package"}
          </button>
        </form>
      </main>
    </div>
  );
} 