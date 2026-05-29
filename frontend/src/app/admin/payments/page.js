"use client";

import { apiUrl } from "@/lib/apiConfig";
import { getRole, getToken } from "@/lib/authStorage";
import AdminSidebar from "@/components/AdminSidebar";
import {
  CreditCard,
  Eye,
  Hash,
  Mail,
  ReceiptText,
  Search,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const paidStatuses = new Set(["completed", "success", "paid"]);

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getStatusClass(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (paidStatuses.has(normalizedStatus)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (normalizedStatus === "pending") {
    return "bg-amber-50 text-amber-800 ring-amber-100";
  }

  if (normalizedStatus === "failed" || normalizedStatus === "cancelled") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  return "bg-gray-100 text-gray-700 ring-gray-200";
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    completedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    transactionCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);
  const paymentsPerPage = 10;

  const fetchPayments = useCallback(async () => {
    const token = getToken();

    try {
      const res = await fetch(apiUrl("/admin/payments"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load payments");
      }

      const data = await res.json();
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setSummary({
        totalRevenue: Number(data.summary?.totalRevenue) || 0,
        completedCount: Number(data.summary?.completedCount) || 0,
        pendingCount: Number(data.summary?.pendingCount) || 0,
        failedCount: Number(data.summary?.failedCount) || 0,
        transactionCount: Number(data.summary?.transactionCount) || 0,
      });
    } catch (error) {
      console.error("Error fetching admin payments:", error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

    fetchPayments();
  }, [fetchPayments, router]);

  const filteredPayments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return payments.filter((payment) => {
      const status = String(payment.status || "").toLowerCase();
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const searchableText = [
        payment.customer_name,
        payment.customer_email,
        payment.reference_id,
        payment.transaction_id,
        payment.items,
        payment.booking_numbers,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [payments, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / paymentsPerPage));
  const currentPayments = filteredPayments.slice(
    (currentPage - 1) * paymentsPerPage,
    currentPage * paymentsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const updatePaymentStatus = async (payment, status) => {
    const token = getToken();
    setUpdatingPaymentId(payment.id);

    try {
      const res = await fetch(apiUrl(`/admin/payments/${payment.id}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update payment status");
      }

      await fetchPayments();
      setSelectedPayment((current) =>
        current?.id === payment.id ? { ...current, status } : current
      );
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert(error.message || "Unable to update payment status");
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const canMarkCompleted = (payment) =>
    String(payment?.status || "").toLowerCase() === "pending";

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading payments...</div>;
  }

  return (
    <AdminSidebar>
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-gray-50 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
                  Payment details
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">
                  {selectedPayment.transaction_id || selectedPayment.reference_id || `Payment ${selectedPayment.id}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayment(null)} 
                className="rounded-md p-2 text-gray-500 transition hover:bg-white hover:text-gray-700"
              > 
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">
              <DetailItem icon={UserRound} label="Customer" value={selectedPayment.customer_name || "Unknown customer"} />
              <DetailItem icon={Mail} label="Email" value={selectedPayment.customer_email || "-"} />
              <DetailItem icon={Hash} label="Reference ID" value={selectedPayment.reference_id || "-"} />
              <DetailItem icon={ReceiptText} label="Transaction ID" value={selectedPayment.transaction_id || "-"} />
              <DetailItem icon={CreditCard} label="Method" value={selectedPayment.payment_method || "-"} />
              <DetailItem icon={Wallet} label="Amount" value={formatCurrency(selectedPayment.amount)} />
              <DetailItem icon={Hash} label="Bookings" value={selectedPayment.booking_numbers || selectedPayment.booking_ids || "-"} />
              <DetailItem icon={ReceiptText} label="Items" value={selectedPayment.items || "-"} />
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className={`w-fit rounded-md px-3 py-1.5 text-xs font-semibold capitalize ring-1 ${getStatusClass(selectedPayment.status)}`}>
                {selectedPayment.status || "unknown"}
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="text-sm text-gray-600">{formatDate(selectedPayment.created_at)}</div>
                {canMarkCompleted(selectedPayment) && (
                  <button
                    type="button"
                    onClick={() => updatePaymentStatus(selectedPayment, "completed")}
                    disabled={updatingPaymentId === selectedPayment.id}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingPaymentId === selectedPayment.id ? "Updating..." : "Mark Completed"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 pl-16 sm:pl-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Review customer transactions, payment status, booking items, and total revenue.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchPayments}
            className="w-fit rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total revenue" value={formatCurrency(summary.totalRevenue)} />
          <SummaryCard label="Transactions" value={summary.transactionCount} />
          <SummaryCard label="Completed" value={summary.completedCount} />
          <SummaryCard label="Pending or failed" value={summary.pendingCount + summary.failedCount} />
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search customer, transaction, booking"
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm text-gray-900 transition placeholder:text-gray-400"
            />
          </div>

          <div className="inline-flex w-fit rounded-md border border-gray-200 bg-gray-50 p-1">
            {["all", "completed", "pending", "failed"].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded px-3 py-1.5 text-sm font-semibold capitalize transition ${
                  statusFilter === filter
                    ? "bg-white text-pink-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-pink-50 text-xs uppercase tracking-wide text-gray-700">
              <tr>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Transaction</th>
                <th className="px-5 py-3 text-left">Booking</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Method</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentPayments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-gray-500">
                    No payments found.
                  </td>
                </tr>
              ) : (
                currentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 last:border-b-0 transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{payment.customer_name || "Unknown customer"}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{payment.customer_email || "-"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{payment.transaction_id || "-"}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{payment.reference_id || "-"}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      <p className="max-w-xs truncate">{payment.items || "-"}</p>
                      <p className="mt-0.5 text-xs text-gray-500">Booking {payment.booking_numbers || payment.booking_ids || "-"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${getStatusClass(payment.status)}`}>
                        {payment.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-5 py-4 capitalize text-gray-700">{payment.payment_method || "-"}</td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex justify-end gap-2">
                        {canMarkCompleted(payment) && (
                          <button
                            type="button"
                            onClick={() => updatePaymentStatus(payment, "completed")}
                            disabled={updatingPaymentId === payment.id}
                            className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingPaymentId === payment.id ? "Updating" : "Completed"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedPayment(payment)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-600 md:flex-row">
          <div>
            Showing {currentPayments.length} of {filteredPayments.length} payments
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AdminSidebar>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Icon size={15} />
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
