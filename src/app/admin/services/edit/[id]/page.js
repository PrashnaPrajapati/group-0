"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch service by ID
  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await fetch(
          `http://localhost:5001/admin/services`,
          {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("token"),
            },
          }
        );

        const data = await res.json();
        const service = data.find((s) => s.id == id);

        if (!service) {
          setError("Service not found");
          return;
        }

        setForm({
          name: service.name,
          description: service.description || "",
          price: service.price,
          duration: service.duration,
        });

        setLoading(false);
      } catch (err) {
        setError("Failed to load service");
        setLoading(false);
      }
    };

    fetchService();
  }, [id]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Update service
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.price || !form.duration) {
      setError("Required fields are missing");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `http://localhost:5001/admin/services/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Update failed");
        setSaving(false);
        return;
      }

      router.push("/admin/services");
    } catch (err) {
      setError("Something went wrong");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        Loading service...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff7fa] flex justify-center items-center p-6">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-pink-500 mb-6">
          Edit Service
        </h1>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Service Name *
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 text-gray-900 rounded-lg px-4 py-2 "
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3"
              className="w-full border-2 border-gray-300 text-gray-900 rounded-lg px-4 py-2 "
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Price (Rs.) *
            </label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 text-gray-900 rounded-lg px-4 py-2"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Duration *
            </label>
            <input
              type="text"
              name="duration"
              value={form.duration}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 text-gray-900 rounded-lg px-4 py-2 "
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2 rounded-full border text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-full  bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:bg-pink-600 disabled:opacity-50"
            >
              {saving ? "Updating..." : "Update Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
