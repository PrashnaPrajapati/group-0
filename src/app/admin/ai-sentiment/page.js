
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

export default function AiSentimentPage() {
  const router = useRouter();
  const [feedbackData, setFeedbackData] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sortBy] = useState("date");
  const [sortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      setError("Admin auth required. Please login again.");
      setLoading(false);
      router.replace("/login");
      return;
    }

    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = new URL("http://localhost:5001/admin/ai-sentiment-details");
        url.searchParams.set("page", page);
        url.searchParams.set("limit", limit);
        if (search.trim()) url.searchParams.set("search", search.trim());

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const res = await fetch(url.toString(), { headers });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(`${res.status} ${res.statusText}: ${data.message || "Failed to fetch sentiment data"}`);
        }

        const payload = await res.json();
        setFeedbackData(Array.isArray(payload.data) ? payload.data : []);
        setTotalPages(payload.meta?.totalPages || 1);
        setTotalCount(payload.meta?.total || 0);
      } catch (err) {
        console.error("Error loading AI sentiment details:", err);
        setError(err.message || "Unable to load feedback sentiment data");
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [page, limit, search, router]);

  const filteredFeedback = useMemo(() => {
    let filtered = filter === "all" ? feedbackData : feedbackData.filter((item) => item.sentiment === filter);

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "score") {
        const aScore = Number(a.sentimentScore || 0);
        const bScore = Number(b.sentimentScore || 0);
        if (aScore === bScore) return 0;
        return sortOrder === "asc" ? aScore - bScore : bScore - aScore;
      }

      const aDate = new Date(a.createdAt);
      const bDate = new Date(b.createdAt);
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    });

    return sorted;
  }, [feedbackData, filter, sortBy, sortOrder]);

  const sentimentChartData = [
    { sentiment: "positive", value: feedbackData.filter((l) => l.sentiment === "positive").length },
    { sentiment: "neutral", value: feedbackData.filter((l) => l.sentiment === "neutral").length },
    { sentiment: "negative", value: feedbackData.filter((l) => l.sentiment === "negative").length },
  ];

  return (
    <AdminSidebar>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto w-full max-w-6xl">
          <h1 className="text-3xl font-bold text-center text-pink-500 mb-6">
            <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              AI Sentiment Dashboard
            </span>
          </h1>

          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white shadow-lg rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Total Feedback</p>
              <p className="text-2xl font-bold text-gray-800">{totalCount}</p>
            </div>
            <div className="bg-white shadow-lg rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Positive %</p>
              <p className="text-2xl font-bold text-green-600">
                {totalCount === 0 ? "0%" : `${Math.round((feedbackData.filter((item) => item.sentiment === "positive").length / (totalCount || 1)) * 100)}%`}
              </p>
            </div>
            <div className="bg-white shadow-lg rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Neutral %</p>
              <p className="text-2xl font-bold text-gray-700">
                {totalCount === 0 ? "0%" : `${Math.round((feedbackData.filter((item) => item.sentiment === "neutral").length / (totalCount || 1)) * 100)}%`}
              </p>
            </div>
            <div className="bg-white shadow-lg rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Negative %</p>
              <p className="text-2xl font-bold text-red-600">
                {totalCount === 0 ? "0%" : `${Math.round((feedbackData.filter((item) => item.sentiment === "negative").length / (totalCount || 1)) * 100)}%`}
              </p>
            </div>
          </div>

          

          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {["all", "positive", "neutral", "negative"].map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-4 py-2 rounded-full border font-medium ${
                  filter === value ? "bg-pink-400 text-white border-pink-500" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search customer or feedback"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border rounded-md w-60"
              />
              <span className="text-sm text-gray-500">Total page entries: {feedbackData.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Rows:</label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border rounded-md"
              >
                {[10, 20, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && <p className="text-center text-gray-500">Loading sentiment data...</p>}
          {error && <p className="text-center text-red-600">{error}</p>}

          {!loading && !error && (
            <div className="overflow-x-auto bg-white rounded-xl shadow-lg p-4">
              <table className="w-full text-left text-sm text-gray-700 border-collapse">
                <thead className="bg-pink-50 text-gray-700">
                  <tr>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Feedback</th>
                    <th className="p-3">Rating</th>
                    <th className="p-3">Sentiment</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedback.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">
                        No matching feedback found.
                      </td>
                    </tr>
                  ) : (
                    filteredFeedback.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="p-3 font-medium text-gray-800">{item.customer || "Unknown"}</td>
                        <td className="p-3 text-gray-700">{item.feedback}</td>
                        <td className="p-3 text-gray-700">{item.rating || "-"}</td>
                        <td className="p-3 capitalize">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                              item.sentiment === "positive" ? "bg-green-100 text-green-700" :
                              item.sentiment === "negative" ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.sentiment}
                          </span>
                        </td>
                        <td className="p-3 text-gray-700">{item.sentimentScore?.toFixed(3) ?? "0.000"}</td>
                        <td className="p-3 text-gray-600">{new Date(item.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                <div>Showing {filteredFeedback.length} / {totalCount}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded border bg-white text-gray-700 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 rounded border bg-white text-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminSidebar>
  );
}
