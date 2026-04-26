"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import NotificationSystem from "./NotificationSystem";
import { clearAuthSession, getToken } from "@/lib/authStorage";

export default function Navbar({ onMenuClick }) {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const fetchProfile = () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setUserId(null);
      setUserRole(null);
      return;
    }
 
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
                clearAuthSession();
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
 
      <div className="flex items-center gap-4">
        {/* LOGO */} 
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          ✦ Singar Glow
        </h1>
      </div>
 
      <div className="flex items-center gap-6">
 
        <NotificationSystem userId={userId} userRole={userRole} onChatCountChange={setChatUnreadCount} />
        <button
          onClick={() => router.push("/chat")}
          className="relative text-2xl p-2 hover:bg-gray-100 rounded-full"
        >
          💬
          {chatUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
            </span>
          )}
        </button>
 
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
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