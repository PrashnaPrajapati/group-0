"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [services, setServices] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:5001/admin/services", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    setServices(data);
  };

  const addService = async () => {
    const token = localStorage.getItem("token");

    await fetch("http://localhost:5001/admin/services", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, price, duration }),
    });

    setName("");
    setPrice("");
    setDuration("");
    fetchServices();
  };

  const deleteService = async (id) => {
    const token = localStorage.getItem("token");

    await fetch(`http://localhost:5001/admin/services/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    fetchServices();
  };

  return (
    <div className="min-h-screen bg-pink-50 p-8">
      <h1 className="text-3xl font-bold mb-6 text-pink-600">
        Manage Services
      </h1>

      {/* Add Service */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="font-semibold mb-4">Add New Service</h2>

        <div className="grid md:grid-cols-3 gap-4">
          <input
            className="border p-2 rounded"
            placeholder="Service Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Duration (mins)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>

        <button
          onClick={addService}
          className="mt-4 bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700"
        >
          Add Service
        </button>
      </div>

      {/* Services List */}
      <div className="bg-white rounded-xl shadow">
        {services.map((s) => (
          <div
            key={s.id}
            className="flex justify-between items-center p-4 border-b"
          >
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-gray-500">
                ₹{s.price} • {s.duration} mins
              </p>
            </div>

            <button
              onClick={() => deleteService(s.id)}
              className="text-red-500 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
