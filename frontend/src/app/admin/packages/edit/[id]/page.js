"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getToken } from "@/lib/authStorage";
import { ArrowLeft } from "lucide-react";

export default function EditPackagePage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const token = getToken();
 
  useEffect(() => {
    fetch(apiUrl("/services"))
      .then((res) => res.json())
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]));
  }, []);
 
  useEffect(() => {
    if (!id) return;

    const fetchPackage = async () => {
      try {
        const res = await fetch(apiUrl(`/admin/packages/${id}`), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Package not found");
          setLoading(false);
          return;
        }

        setName(data.name || "");
        setDescription(data.description || "");
        setPrice(data.price || "");
        setDuration(data.duration || "");

        setSelectedServices(
          Array.isArray(data.services)
            ? data.services.map((s) => Number(s.id))
            : []
        );

        if (data.image) {
          setImage(data.image);
          setPreview(apiUrl(data.image.startsWith("http") ? data.image : `/uploads/packages/${data.image}`));
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load package");
        setLoading(false);
      }
    };

    fetchPackage();
  }, [id]);
 
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
    if (!file) return;

    setImage(file);

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !price || !duration || selectedServices.length === 0) {
      setError("Name, price, duration, and at least one service are required.");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("price", price);
      formData.append("duration", duration);
      formData.append("status", "active");
      formData.append("service_ids", JSON.stringify(selectedServices));

      if (image && typeof image !== "string") {
        formData.append("image", image);
      }

      const res = await fetch(apiUrl(`/admin/packages/${id}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      let data;

      try {
        data = await res.json();
      } catch {
        throw new Error("Server returned invalid response");
      }

      if (!res.ok) {
        setError(data.message || "Update failed");
        setSaving(false);
        return;
      }

      toast.success("Package updated successfully");

      setTimeout(() => {
        router.push("/admin/packages");
      }, 1200);
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">Loading package...</div>
    );

  return (
    <AdminSidebar>
      <ToastContainer position="top-center" />
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
        Edit Package
      </span>
    </h1>
    <p className="mb-6 text-center text-sm text-gray-500">
      Update package details, linked services, pricing, duration, and image.
    </p>

    {error && (
      <div className="bg-red-100 text-red-600 p-3 rounded mb-4">
        {error}
      </div>
    )}

         <form
      onSubmit={handleSubmit}
      className="space-y-4"
    > 
          <div className="mb-4">
            <label className="block mb-1 font-medium text-black">
              Package Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
          </div>
 
          <div className="mb-4">
            <label className="block mb-1 font-medium text-black">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              rows={3}
            />
          </div>
 
          <div className="mb-4">
            <label className="block mb-1 font-medium text-black">
              Price (Rs.) *
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
          </div>
 
          <div className="mb-4">
            <label className="block mb-1 font-medium text-black">
              Duration (days) *
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
          </div>
 
          <div className="mb-4">
            <label className="block mb-1 font-medium text-black">
              Package Image
            </label>

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
                className="cursor-pointer px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded hover:bg-pink-600"
              >
                {image ? "Change Image" : "Choose Image"}
              </label>

              {image && (
                <span className="text-black">
                  {typeof image === "string" ? "Current Image" : image.name}
                </span>
              )}
            </div>

            {preview && (
              <img
                src={preview}
                alt=""
                className="mt-3 w-32 h-32 object-cover rounded"
              />
            )}
          </div>
 
          <div className="mb-4">
            <label className="block mb-2 font-medium text-black">
              Select Services *
            </label>

            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border p-3 rounded bg-white">
              {services.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 cursor-pointer text-black"
                >
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(Number(s.id))}
                    onChange={() => handleServiceToggle(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full"
          >
            {saving ? "Updating..." : "Update Package"}
          </button>
        </form>
        </div>
    </AdminSidebar>
  );
}
