"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getRole, getToken } from "@/lib/authStorage";
import {
  Ban,
  CalendarDays,
  Eye,
  Hash,
  LockKeyhole,
  Mail,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  UserRound,
  X,
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockTargetUser, setBlockTargetUser] = useState(null);
  const [blockReason, setBlockReason] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const usersPerPage = 12;
  const router = useRouter();

  const token = getToken();

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/admin/users"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load users");
      }

      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Unable to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return router.replace("/login");
    }

    const role = getRole();
    if (role !== "admin") {
      return router.replace("/dashboard");
    }

    fetchUsers();
  }, [fetchUsers, router, token]);

  const confirmWithToast = (message, onConfirm) => {
    toast.info(
      ({ closeToast }) => (
        <div>
          <p className="font-medium mb-3">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                onConfirm();
                closeToast();
              }}
              className="px-3 py-1 rounded bg-pink-500 text-white text-sm"
            >
              Yes
            </button>
            <button
              onClick={closeToast}
              className="px-3 py-1 rounded bg-gray-200 text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { autoClose: false, closeOnClick: false }
    );
  };

  const blockUser = (user) => {
    setBlockTargetUser(user);
    setBlockReason("");
    setIsBlockModalOpen(true);
  };

  const confirmBlockUser = async () => {
    const reason = blockReason.trim();
    if (!reason) {
      toast.error("Block reason is required.");
      return;
    }

    setIsBlockModalOpen(false);

    try {
      const res = await fetch(apiUrl(`/admin/users/${blockTargetUser.id}/block`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(`Status ${res.status}: ${result.message || "Failed to block user"}`);
      }

      toast.success(`User blocked successfully: ${reason}`);
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Unable to block user");
    }
  };

  const closeBlockModal = () => {
    setIsBlockModalOpen(false);
    setBlockTargetUser(null);
    setBlockReason("");
  };

  const unblockUser = (user) => {
    confirmWithToast(
      `Unblock ${user.fullName}?`,
      async () => {
        try {
          const res = await fetch(apiUrl(`/admin/users/${user.id}/unblock`), {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            const result = await res.json().catch(() => ({}));
            throw new Error(`Status ${res.status}: ${result.message || "Failed to unblock user"}`);
          }

          toast.success("User unblocked successfully");
          fetchUsers();
        } catch (error) {
          console.error(error);
          toast.error(error.message || "Unable to unblock user");
        }
      }
    );
  };

  const getIsVerified = (user) =>
    user?.isEmailVerified === 1 || user?.isEmailVerified === true;

  const isStaleUnverifiedUser = (user) => {
    if (!user || getIsVerified(user) || user.role === "admin" || !user.created_at) {
      return false;
    }

    const createdAt = new Date(user.created_at).getTime();
    if (Number.isNaN(createdAt)) return false;

    return Date.now() - createdAt >= 48 * 60 * 60 * 1000;
  };

  const deleteUser = (user) => {
    confirmWithToast(
      `Delete unverified account for ${user.fullName || user.email}? This cannot be undone.`,
      async () => {
        try {
          const res = await fetch(apiUrl(`/admin/users/${user.id}`), {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            const result = await res.json().catch(() => ({}));
            throw new Error(result.message || "Failed to delete user");
          }

          toast.success("Unverified user deleted successfully");
          setSelectedUser(null);
          fetchUsers();
        } catch (error) {
          console.error(error);
          toast.error(error.message || "Unable to delete user");
        }
      }
    );
  };

  const filteredUsers = users.filter((user) => {
    const isVerified = user.isEmailVerified === 1 || user.isEmailVerified === true;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      user.fullName?.toLowerCase().includes(normalizedSearch) ||
      user.email?.toLowerCase().includes(normalizedSearch) ||
      user.phone?.toLowerCase().includes(normalizedSearch);

    if (verificationFilter === "verified") return isVerified && matchesSearch;
    if (verificationFilter === "unverified") return !isVerified && matchesSearch;
    return matchesSearch;
  });

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const blockedCount = users.filter((user) => user.blocked).length;
  const adminCount = users.filter((user) => user.role === "admin").length;
  const regularUserCount = users.length - adminCount;

  if (loading)
    return <div className="p-10 text-center text-gray-500">Loading users...</div>;

  return (
    <AdminSidebar>
      <ToastContainer position="top-center" />

      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Block user</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Add a reason for <span className="font-semibold">{blockTargetUser?.fullName}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={closeBlockModal}
                className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              > 
                <X size={18} />
              </button>
            </div>
            <textarea
              className="mt-5 w-full min-h-[120px] rounded-md border border-gray-300 bg-white p-4 text-sm text-gray-900"
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              placeholder="Enter the reason why this user is blocked"
            />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeBlockModal}
                className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBlockUser}
                className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Block user
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-pink-100 text-xl font-bold text-pink-700">
                  {(selectedUser.fullName || selectedUser.email || "U").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedUser.fullName || "User details"}</h2>
                  <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                    <Mail size={15} />
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-md p-2 text-gray-500 transition hover:bg-white hover:text-gray-700"
              > 
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                  {selectedUser.role || "users"}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ${
                  selectedUser.blocked
                    ? "bg-red-50 text-red-700 ring-red-100"
                    : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                }`}>
                  {selectedUser.blocked ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                  {selectedUser.blocked ? "Blocked" : "Active"}
                </span>
                <span className={`rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ${
                  getIsVerified(selectedUser)
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    : "bg-amber-50 text-amber-800 ring-amber-100"
                }`}>
                  {getIsVerified(selectedUser) ? "Verified email" : "Unverified email"}
                </span>
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section>
                <h3 className="text-sm font-semibold text-gray-900">Profile</h3>
                <dl className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {[
                    { icon: Hash, label: "User ID", value: selectedUser.id },
                    { icon: Phone, label: "Phone", value: selectedUser.phone || "-" },
                    { icon: UserRound, label: "Gender", value: selectedUser.gender || "-" },
                    { icon: CalendarDays, label: "Joined", value: formatDate(selectedUser.created_at) },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-3">
                      <Icon className="text-gray-400" size={17} />
                      <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
                      <dd className="min-w-0 flex-1 text-sm text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900">Security</h3>
                <dl className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <LockKeyhole className="text-gray-400" size={17} />
                    <dt className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">Failed Attempts</dt>
                    <dd className="text-sm text-gray-900">{selectedUser.failedLoginAttempts || 0}</dd>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <LockKeyhole className="text-gray-400" size={17} />
                    <dt className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">Locked Until</dt>
                    <dd className="text-sm text-gray-900">
                      {selectedUser.lockUntil ? new Date(selectedUser.lockUntil).toLocaleString() : "-"}
                    </dd>
                  </div>
                </dl>

                {selectedUser.blockedReason && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Blocked Reason</p>
                    <p className="mt-2 text-sm text-red-900">{selectedUser.blockedReason}</p>
                  </div>
                )}
              </section>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  selectedUser.blocked ? unblockUser(selectedUser) : blockUser(selectedUser);
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
                  selectedUser.blocked
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {selectedUser.blocked ? <Unlock size={16} /> : <Ban size={16} />}
                {selectedUser.blocked ? "Unblock user" : "Block user"}
              </button>
              {isStaleUnverifiedUser(selectedUser) && (
                <button
                  type="button"
                  onClick={() => deleteUser(selectedUser)}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
                >
                  <Trash2 size={16} />
                  Delete user
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="pl-16">
            <h1 className="text-3xl font-bold text-gray-900">Users</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Review user accounts, verification status, and account access.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-gray-500">Total</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{users.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-gray-500">Users</p>
              <p className="mt-1 text-xl font-semibold text-pink-700">{regularUserCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-gray-500">Admins</p>
              <p className="mt-1 text-xl font-semibold text-indigo-700">{adminCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-gray-500">Blocked</p>
              <p className="mt-1 text-xl font-semibold text-red-700">{blockedCount}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search users"
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm text-gray-900 transition placeholder:text-gray-400"
            />
          </div>
          <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">
            {["all", "verified", "unverified"].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setVerificationFilter(filter);
                  setCurrentPage(1);
                }}
                className={`rounded px-3 py-1.5 text-sm font-semibold capitalize transition ${
                  verificationFilter === filter
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
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-pink-50 text-gray-700">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Name</th>
                <th className="px-5 py-4 text-left font-semibold">Email</th>
                <th className="px-5 py-4 text-left font-semibold">Role</th>
                <th className="px-5 py-4 text-left font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                currentUsers.map((user) => {
                  const isVerified = getIsVerified(user);

                  return (
                    <tr key={user.id} className="border-b border-gray-100 last:border-b-0 transition-colors hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{user.fullName || "-"}</p>
                        <p className="mt-0.5 text-xs text-gray-500">ID {user.id}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{user.email}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {user.role || "users"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                            user.blocked
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {user.blocked ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                            {user.blocked ? "Blocked" : "Active"}
                          </span>
                          <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                            isVerified
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {isVerified ? "Verified" : "Unverified"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            onClick={() =>
                              user.blocked ? unblockUser(user) : blockUser(user)
                            }
                            className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                              user.blocked
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                                : "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                            }`}
                          >
                            {user.blocked ? <Unlock size={14} /> : <Ban size={14} />}
                            {user.blocked ? "Unblock" : "Block"}
                          </button>
                          {isStaleUnverifiedUser(user) && (
                            <button
                              onClick={() => deleteUser(user)}
                              className="inline-flex items-center gap-1 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-800"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-600 md:flex-row">
          <div>
            Showing {currentUsers.length} of {filteredUsers.length} users
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
