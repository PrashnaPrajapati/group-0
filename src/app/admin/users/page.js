"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockTargetUser, setBlockTargetUser] = useState(null);
  const [blockReason, setBlockReason] = useState("");
  const usersPerPage = 12;
  const router = useRouter();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5001/admin/users", {
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
  };

  useEffect(() => {
    if (!token) {
      return router.replace("/login");
    }

    const role = localStorage.getItem("role");
    if (role !== "admin") {
      return router.replace("/dashboard");
    }

    fetchUsers();
  }, [router, token]);

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

  const toggleRole = async (user) => {
    const newRole = user.role === "admin" ? "users" : "admin";
    confirmWithToast(
      `Are you sure you want to change ${user.fullName}'s role to ${newRole}?`,
      async () => {
        try {
          const res = await fetch(`http://localhost:5001/admin/users/${user.id}/role`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: newRole }),
          });

          if (!res.ok) {
            const result = await res.json().catch(() => ({}));
            throw new Error(result.message || "Failed to update role");
          }

          toast.success("User role updated successfully");
          fetchUsers();
        } catch (error) {
          console.error(error);
          toast.error("Unable to update user role");
        }
      }
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
      const res = await fetch(`http://localhost:5001/admin/users/${blockTargetUser.id}/block`, {
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
          const res = await fetch(`http://localhost:5001/admin/users/${user.id}/unblock`, {
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

  const deleteUser = (user) => {
    confirmWithToast(
      `Are you sure you want to permanently delete ${user.fullName}?`,
      async () => {
        try {
          const res = await fetch(`http://localhost:5001/admin/users/${user.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            const result = await res.json().catch(() => ({}));
            throw new Error(result.message || "Failed to delete user");
          }

          toast.success("User deleted successfully");
          fetchUsers();
        } catch (error) {
          console.error(error);
          toast.error("Unable to delete user");
        }
      }
    );
  };

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.max(1, Math.ceil(users.length / usersPerPage));

  if (loading)
    return <div className="p-10 text-center text-gray-500">Loading users...</div>;

  return (
    <AdminSidebar>
      <ToastContainer position="top-center" />

      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Block user</h2>
            <p className="text-sm text-gray-600 mb-4">
              Send a block reason for <span className="font-semibold">{blockTargetUser?.fullName}</span>.
            </p>
            <textarea
              className="w-full min-h-[120px] rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-900 focus:border-pink-400 focus:outline-none"
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              placeholder="Enter the reason why this user is blocked"
            />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeBlockModal}
                className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBlockUser}
                className="rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-pink-600"
              >
                Block user
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 mt-2 max-w-2xl">
              View, promote, demote, or remove users directly from the admin portal.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-pink-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-pink-50 text-gray-700 uppercase tracking-wide text-xs">
              <tr>
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Phone</th>
                <th className="p-4 text-left">Role</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Blocked Reason</th>
                <th className="p-4 text-left">Joined</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                currentUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-b-0 hover:bg-pink-50/30 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{user.id}</td>
                    <td className="p-4 text-gray-900">{user.fullName || "—"}</td>
                    <td className="p-4 text-gray-900">{user.email}</td>
                    <td className="p-4 text-gray-900">{user.phone || "—"}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                        {user.role || "users"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.blocked
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {user.blocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 max-w-[240px] break-words">
                      {user.blockedReason || "—"}
                    </td>
                    <td className="p-4 text-gray-700">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => toggleRole(user)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                            user.role === "admin"
                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                              : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                          }`}
                        >
                          {user.role === "admin" ? "Revoke" : "Make Admin"}
                        </button>
                        <button
                          onClick={() =>
                            user.blocked ? unblockUser(user) : blockUser(user)
                          }
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                            user.blocked
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          {user.blocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={() => deleteUser(user)}
                          className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 text-xs font-semibold transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-700">
          <div>
            Showing {currentUsers.length} of {users.length} users
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AdminSidebar>
  );
}
