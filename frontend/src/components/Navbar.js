"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import NotificationSystem from "./NotificationSystem";
import { clearAuthSession, getToken } from "@/lib/authStorage";
import { MessageCircle, Sparkles } from "lucide-react";
 
export default function Navbar() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const profileMenuId = "user-profile-menu";
  const profileMenuRef = useRef(null);
 
  const resetProfile = useCallback(() => {
    setUser(null);
    setUserId(null);
    setUserRole(null);
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      resetProfile();
      return;
    }
 
    try {
      const decoded = jwtDecode(token);
      setUserId(decoded.id);
      setUserRole(decoded.role);
    } catch (error) {
      console.error("Error decoding token:", error);
      clearAuthSession();
      resetProfile();
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(apiUrl("/profile"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          clearAuthSession();
          resetProfile();
          router.push("/login");
        }
        throw new Error(data?.message || "Profile request failed");
      }

      setUser({
        ...data,
        photoUrl:
          data?.photoUrl && !data.photoUrl.startsWith("http")
            ? apiUrl(`${data.photoUrl}`)
            : data?.photoUrl,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      resetProfile();
    }
  }, [resetProfile, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const handleProfileUpdate = () => fetchProfile();
    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () =>
      window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, [fetchProfile]);

  useEffect(() => {
    if (!showProfileMenu) return;

    const handleOutsideClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    if (!userId || userRole !== "users") return;

    const fetchUserChatUnread = async () => {
      try {
        const token = getToken();
        const res = await fetch(apiUrl("/messages/unread-count"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        setChatUnreadCount(Number(data.unreadCount || 0));
      } catch (error) {
        console.error("Error fetching user chat unread count:", error);
      }
    };

    fetchUserChatUnread();
    window.addEventListener("focus", fetchUserChatUnread);
    const intervalId = setInterval(fetchUserChatUnread, 15000);

    return () => {
      window.removeEventListener("focus", fetchUserChatUnread);
      clearInterval(intervalId);
    };
  }, [userId, userRole]);

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
    <header className="fixed top-0 left-0 right-0 flex justify-between items-center bg-gray-100 px-6 py-4 shadow-md border-b h-20 z-50">
 
      <div className="flex items-center gap-4"> 
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          <Sparkles size={24} className="text-pink-500" />
          <span>Singar Glow</span>
        </h1>
      </div>
 
      <div className="flex items-center gap-6">
 
        <NotificationSystem userId={userId} userRole={userRole} />
        <button
          onClick={() => router.push("/chat")}
          aria-label="Open chat"
          className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full"
        > 
          <MessageCircle size={24} />
          {chatUnreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold leading-none text-white ring-2 ring-white">
              {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
            </span>
          )}
        </button>
 
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            aria-expanded={showProfileMenu}
            aria-controls={profileMenuId}
            aria-label="Open profile menu"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
            }} 
            className="flex items-center gap-2 rounded"
          > 
            <img
              src={user?.photoUrl || "/default-avatar.png"}
              alt={user?.fullName || "User profile"}
              className="w-9 h-9 rounded-full border"
            /> 

            <span className="hidden md:block font-medium text-gray-700">
              {user?.fullName || "User"}
            </span>
          </button>

          {showProfileMenu && (
            <div id={profileMenuId} className="absolute right-0 mt-3 w-44 bg-white border rounded-xl shadow-lg z-50">

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
    </header>
    </>
  );
}
