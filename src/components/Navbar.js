"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import NotificationSystem from "./NotificationSystem";

export default function Navbar({ onMenuClick }) {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const fetchProfile = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setUserId(null);
      setUserRole(null);
      return;
    }

    // Decode token to get user info
    try {
      const decoded = jwtDecode(token);
      setUserId(decoded.id);
      setUserRole(decoded.role);
    } catch (error) {
      console.error("Error decoding token:", error);
      setUserId(null);
      setUserRole(null);
    }

    fetch("http://localhost:5001/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.photoUrl && !data.photoUrl.startsWith("http")) {
          data.photoUrl = `http://localhost:5001${data.photoUrl}`;
        }
        setUser(data);
      })
      .catch(() => {
        setUser(null);
        setUserId(null);
        setUserRole(null);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const handleProfileUpdate = () => fetchProfile();
    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () =>
      window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, []);

  const handleLogout = () => {
    setShowProfileMenu(false);

    toast(
      ({ closeToast }) => (
        <div className="flex flex-col gap-3">
          <p>Are you sure you want to logout?</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                localStorage.removeItem("token");
                router.push("/login");
                closeToast();
              }}
              className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
            >
              Yes, Logout
            </button>
            <button
              onClick={closeToast}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        position: "top-center",
        autoClose: false,
        closeButton: false,
      }
    );
  };

  return (
    <>
    <div className="fixed top-0 left-0 right-0 flex justify-between items-center bg-gray-100 px-6 py-4 shadow-md border-b h-20 z-50">

      {/* LEFT SIDE */}
      <div className="flex items-center gap-4">

        {/* ☰ button (mobile only) */}
        <button
          onClick={onMenuClick}
          className="text-3xl md:hidden text-gray-700"
        >
          ☰
        </button>

        {/* LOGO */}
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          ✦ Singar Glow
        </h1>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-6">

        {/* Notifications */}
        <NotificationSystem userId={userId} userRole={userRole} />

        {/* Chat */}
        <button
          onClick={() => router.push("/chat")}
          className="text-2xl"
        >
          💬
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2"
          >
            <img
              src={user?.photoUrl || "/default-avatar.png"}
              className="w-9 h-9 rounded-full border"
              alt="profile"
            />

            <span className="hidden md:block font-medium text-gray-700">
              {user?.fullName || "User"}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-44 bg-white border rounded-xl shadow-lg z-50">

              <button
                onClick={() => {
                  router.push("/profile");
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-200 text-gray-700"
              >
                View Profile
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-gray-200 text-red-500"
              >
                Logout
              </button>

            </div>
          )}
        </div>

      </div>
    </div>
    <ToastContainer />
    </>
  );
}