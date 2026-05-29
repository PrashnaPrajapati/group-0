"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getToken } from "@/lib/authStorage";
import { ArrowLeft } from "lucide-react";

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
    gender: "",
    category: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [image, setImage] = useState(null); 
  const [imagePreview, setImagePreview] = useState(""); 
 
  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await fetch(apiUrl(`/admin/services`), {
          headers: {
            Authorization: "Bearer " + getToken(),
          },
        });

        const data = await res.json();
        const service = data.find((s) => s.id == id);

        if (!service) {
          setError("Service not found");
          setLoading(false);
          return;
        }

        setForm({
          name: service.name,
          description: service.description || "",
          price: service.price,
          duration: service.duration,
          gender: service.gender || "",
          category: service.category || "",
        });

        if (service.image) {
          setImagePreview(apiUrl(`${service.image}`));
        }

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };
 
  const updateService = async () => {
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("price", form.price);
      formData.append("duration", form.duration);
      formData.append("gender", form.gender);
      formData.append("category", form.category);

      if (image) formData.append("image", image);

      const res = await fetch(apiUrl(`/admin/services/${id}`), {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + getToken(),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Update failed");
        setSaving(false);
        return;
      }

      setSuccess("Service updated successfully");
      setSaving(false);

      setTimeout(() => {
        router.push("/admin/services");
      }, 1000);
    } catch (err) {
      setError("Something went wrong");
      setSaving(false);
    }
  };
 
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name || !form.price || !form.duration) {
      setError("Required fields are missing");
      return;
    }

    toast.info(
      <div className="flex flex-col gap-2">
        <span>Are you sure you want to update this service?</span>
        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={() => toast.dismiss()}
            className="px-3 py-1 border rounded text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss();
              updateService();
            }}
            className="px-3 py-1 bg-pink-500 text-white rounded"
          >
            Yes, Update
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
      }
    );
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading service...</div>;
  }

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
            Edit Service
          </span>
        </h1> 
        <p className="mb-6 text-center text-sm text-gray-500">
          Update service details, pricing, duration, category, and image.
        </p>
        {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-100 text-green-600 p-3 rounded mb-4 text-sm">{success}</div>}

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
            <label className="block text-md font-medium text-gray-900 mb-1">Service Image</label>

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

            {imagePreview && (
              <img
                src={imagePreview}
                alt=""
                className="mt-2 w-32 h-32 object-cover rounded"
              />
            )}
          </div>
 
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
              className="px-6 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:bg-pink-600 disabled:opacity-50"
            >
              {saving ? "Updating..." : "Update Service"}
            </button>
          </div>
        </form>
      </div>

      <ToastContainer />
    </div>
  );
} 
