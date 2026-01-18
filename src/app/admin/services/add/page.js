"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddServicePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.price || !form.duration) {
      setError("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5001/admin/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to add service");
        setLoading(false);
        return;
      }

      router.push("/admin/services");
    } catch (err) {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff7fa] flex justify-center items-center p-6">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-pink-500 mb-6">
          Add New Service
        </h1>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Service Name */}
          <div>
            <label className="block text-sm text-gray-900 mb-1">
              Service Name *
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
             
              className="w-full border-2 border-gray-200 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              
              rows="3"
              className="w-full border-2 border-gray-200 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-500"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Price (Rs.) *
            </label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
             
              className="w-full border-2 border-gray-200 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Duration *
            </label>
            <input
              type="text"
              name="duration"
              value={form.duration}
              onChange={handleChange}
              
              className="w-full border-2 border-gray-200 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2 rounded-full border text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-full bg-pink-500 text-white bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Add Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
