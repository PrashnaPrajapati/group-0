"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getToken } from "@/lib/authStorage";
import { ArrowLeft } from "lucide-react";

export default function AddServicePage() {
  const router = useRouter();

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
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

    if (!form.name || !form.price || !form.duration) {
      setError("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("price", form.price);
      formData.append("duration", form.duration);
      formData.append("gender", form.gender);
      formData.append("category", form.category);
      if (image) formData.append("image", image);

      const res = await fetch(apiUrl("/admin/services"), {
        method: "POST",
        headers: { 
          Authorization: "Bearer " + getToken(),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to add service");
        setLoading(false);
        return;
      }
 
      toast.success("Service added successfully", {
        position: "top-center",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      setTimeout(() => {
        router.push("/admin/services");
      }, 2000);
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6"> 
      <div className="mx-auto mb-6 flex max-w-3xl justify-start">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>
 
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-rose-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="mb-2 text-center text-2xl font-bold text-pink-500">
          <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Add New Service
          </span>
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Add service details, pricing, duration, category, and an optional image.
        </p>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5"> 
          <div>
            <label className="block text-md font-medium text-gray-900 mb-1">Service Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange} 
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
          </div>
 
          <div>
            <label className="block text-md font-medium text-gray-900 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3" 
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
          </div> 
          <div>
            <label className="block text-md font-medium text-gray-900 mb-1">Price (Rs.) *</label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange} 
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
          </div>
 
          <div>
            <label className="block text-md font-medium text-gray-900 mb-1">Duration *</label>
            <input
              type="text"
              name="duration"
              value={form.duration}
              onChange={handleChange} 
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
          </div>
 
          <div>
            <label className="block text-md font-medium text-gray-900 mb-1">Gender *</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
 
          <div>
            <label className="block text-md font-medium text-gray-900 mb-1">Category *</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
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
            <label className="block text-md font-medium text-gray-900 mb-1">Image</label>
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
                className="cursor-pointer px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded hover:bg-pink-600"
              >
                {image ? "Change Image" : "Choose Image"}
              </label>
              {image && <span className="text-gray-700">{image.name}</span>}
            </div>
            {preview && (
              <img src={preview} alt="" className="mt-2 w-32 h-32 object-cover rounded" />
            )}
          </div>
 
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
      <ToastContainer />
    </div>
  );
} 
