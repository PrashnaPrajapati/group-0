"use client";

import { apiUrl } from "@/lib/apiConfig";
import { clearAuthSession, getRole, getToken } from "@/lib/authStorage";
import AdminSidebar from "@/components/AdminSidebar";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const feedbackPerPage = 10;

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    const fetchFeedback = async () => {
      try {
        const res = await fetch(apiUrl("/admin/feedback"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          clearAuthSession();
          router.replace("/login");
          return;
        }

        if (!res.ok) {
          throw new Error("Unable to load feedback");
        }

        const data = await res.json();
        setFeedbackList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading admin feedback:", err);
        setError(err.message || "Unable to load feedback");
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [router]);

  const filteredFeedback = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return feedbackList;

    return feedbackList.filter((item) =>
      [
        item.customer,
        item.email,
        item.itemName,
        item.itemType,
        item.feedback,
        item.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [feedbackList, query]);

  const totalPages = Math.max(1, Math.ceil(filteredFeedback.length / feedbackPerPage));
  const indexOfLastFeedback = currentPage * feedbackPerPage;
  const indexOfFirstFeedback = indexOfLastFeedback - feedbackPerPage;
  const currentFeedback = filteredFeedback.slice(indexOfFirstFeedback, indexOfLastFeedback);
  const showingStart = filteredFeedback.length === 0 ? 0 : indexOfFirstFeedback + 1;
  const showingEnd = Math.min(indexOfLastFeedback, filteredFeedback.length);

  const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : "-");
  const formatTime = (time) => time?.slice(0, 5) || "-";
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (loading) {
    return (
      <AdminSidebar>
        <div className="p-8 text-center text-gray-500">Loading feedback...</div>
      </AdminSidebar>
    );
  }

  return (
    <AdminSidebar>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-600">Feedback</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">Service Feedback</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review private feedback customers submitted after completed bookings.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Feedback</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{feedbackList.length}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-600">
              Showing {filteredFeedback.length} of {feedbackList.length}
            </p>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search customer, service, feedback"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 sm:w-80"
            />
          </div>

          {error ? (
            <div className="p-10 text-center text-red-500">{error}</div>
          ) : filteredFeedback.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold text-slate-950">No feedback found</p>
              <p className="mt-2 text-sm text-slate-500">
                Customer feedback will appear here after completed services.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-pink-50 text-xs uppercase tracking-[0.12em] text-gray-700">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Booking</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Feedback</th>
                    <th className="px-5 py-3 font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentFeedback.map((item) => (
                    <tr key={item.id} className="align-top transition hover:bg-pink-50/40">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">{item.customer || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.email || ""}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">{item.itemName || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.itemType || "Booking"} #{item.bookingId}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p>{formatDate(item.booking_date)}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatTime(item.booking_time)}</p>
                      </td>
                      <td className="max-w-xl px-5 py-4 text-slate-700">
                        <p className="leading-6">{item.feedback}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(item.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Showing {showingStart}-{showingEnd} of {filteredFeedback.length} feedback
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </AdminSidebar>
  );
}
