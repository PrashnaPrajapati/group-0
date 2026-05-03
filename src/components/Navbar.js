"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import NotificationSystem from "./NotificationSystem";
import { clearAuthSession, getToken } from "@/lib/authStorage";
import { MessageCircle, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Navbar({ onMenuClick }) {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const profileMenuId = "user-profile-menu";
  const { t } = useTranslation();

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

    fetch(apiUrl("/profile"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.photoUrl && !data.photoUrl.startsWith("http")) {
          data.photoUrl = apiUrl(`${data.photoUrl}`);
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
    const intervalId = setInterval(fetchUserChatUnread, 3000);

    return () => clearInterval(intervalId);
  }, [userId, userRole]);

  const handleLogout = () => {
    setShowProfileMenu(false);

    toast(
      ({ closeToast }) => (
        <div className="flex flex-col gap-3">
          <p>{t("logout.confirmQuestion")}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                clearAuthSession();
                router.push("/login");
                closeToast();
              }}
              className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
            >
              {t("logout.confirmButton")}
            </button>
            <button
              onClick={closeToast}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              {t("common.cancel")}
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
        {/* LOGO */} 
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          <Sparkles size={24} className="text-pink-500" aria-hidden="true" />
          <span>Singar Glow</span>
        </h1>
      </div>
 
      <div className="flex items-center gap-6">
 
        <NotificationSystem userId={userId} userRole={userRole} />
        <button
          onClick={() => router.push("/chat")}
          className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
          aria-label={chatUnreadCount > 0 ? t("chat.openWithCount", { count: chatUnreadCount }) : t("chat.open")}
        >
          <MessageCircle size={24} aria-hidden="true" />
          {chatUnreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold leading-none text-white ring-2 ring-white" aria-hidden="true">
              {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
            </span>
          )}
        </button>
 
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
            }} 
            className="flex items-center gap-2 rounded focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            aria-controls={profileMenuId}
          >
            <img
              src={user?.photoUrl || "/default-avatar.png"}
              className="w-9 h-9 rounded-full border"
              alt=""
              aria-hidden="true"
            />

            <span className="hidden md:block font-medium text-gray-700">
              {user?.fullName || t("common.user")}
            </span>
          </button>

          {showProfileMenu && (
            <div id={profileMenuId} className="absolute right-0 mt-3 w-44 bg-white border rounded-xl shadow-lg z-50" role="menu">

              <button
                onClick={() => {
                  router.push("/profile");
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-200 text-gray-700"
                role="menuitem"
              >
                {t("profile.view")}
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-gray-200 text-red-500"
                role="menuitem"
              >
                {t("profile.logout")}
              </button>

            </div>
          )}
        </div>

      </div>
    </header>
    </>
  );
}
