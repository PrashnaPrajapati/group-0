"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import NotificationSystem from "./NotificationSystem";
import { clearAuthSession, getToken } from "@/lib/authStorage";
import { Menu, MessageCircle, Sparkles, X } from "lucide-react";
import { apiUrl } from "@/lib/apiConfig"; 

const menu = [
  { name: "Dashboard", href: "/admin/dashboard" },
  { name: "Users", href: "/admin/users" },
  { name: "Services", href: "/admin/services" },
  { name: "Packages", href: "/admin/packages" },
  { name: "AI Sentiments", href: "/admin/ai-sentiment" },
  { name: "Chat", href: "/admin/chat" },
  { name: "Bookings", href: "/admin/bookings" },
  { name: "Feedback", href: "/admin/feedback" },
  { name: "Payments", href: "/admin/payments" },
];

export default function AdminSidebar({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuId = "admin-profile-menu";
  const profileMenuRef = useRef(null);
  const showChatBadge = chatUnreadCount > 0;

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
      console.error("Error fetching admin profile:", error);
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
    if (userRole !== "admin") return;

    const fetchAdminChatUnread = async () => {
      try {
        const token = getToken();
        const res = await fetch(apiUrl("/admin/messages/unread-per-user"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const countsByUser = await res.json();
        const totalUnread = Object.values(countsByUser || {}).reduce(
          (total, count) => total + Number(count || 0),
          0
        );
        setChatUnreadCount(totalUnread);
      } catch (error) {
        console.error("Error fetching admin chat unread count:", error);
      }
    };

    fetchAdminChatUnread();
    const intervalId = setInterval(fetchAdminChatUnread, 3000);

    return () => clearInterval(intervalId);
  }, [userRole]);

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

  const sidebar = (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-24 left-5 z-60 flex h-12 w-12 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/30"
        > 
          <Menu size={24} />
        </button>
      )}

      <aside
        id="admin-sidebar"
        className={` 
          fixed top-0 left-0 z-40 h-full w-72 bg-white shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 text-xl"
          onClick={() => setIsOpen(false)}
        > 
          <X size={22} />
        </button>

        <div className="p-6 border-b flex justify-center items-center text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Admin Panel
          </h2>
        </div>

        <nav>
        <ul className="flex flex-col gap-2 p-4">
          {menu.map((item) => {
            const isActive = pathname === item.href;
            return ( 
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)} 
                  className={`block px-4 py-3 rounded-lg font-medium transition
                    ${ 
                      isActive
                        ? "bg-pink-50 border-l-4 border-pink-500 text-pink-600"
                        : "text-gray-700 hover:bg-pink-50 hover:text-pink-500"
                    }
                  `}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
        </nav>

        <div className="absolute bottom-4 w-full text-center text-gray-400 text-sm">
          &copy; 2026 Singar Glow Admin
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setIsOpen(false)}
        /> 
      )}
    </>
  );

  if (!children) {
    return sidebar;
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-gray-50">
      {sidebar}

      <div className="flex min-w-0 flex-1 flex-col bg-gray-50">
        {/* Admin Header with Notifications */}
        <header className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between border-b bg-gray-100 px-6 py-4 shadow-md">
          <div>
            <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              <Sparkles size={24} className="text-pink-500" />
              <span>Singar Glow</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationSystem userId={userId} userRole={userRole} />
            <button
              onClick={() => router.push("/admin/chat")}
              className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full"
            > 
              <MessageCircle size={24} />
              {showChatBadge && (
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
                aria-label="Open admin profile menu"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 rounded"
              >
                <img
                  src={user?.photoUrl || "/default-avatar.png"}
                  alt={user?.fullName || "Admin profile"}
                  className="h-9 w-9 rounded-full border"
                />

                <span className="hidden font-medium text-gray-700 md:block">
                  {user?.fullName || "Admin"}
                </span>
              </button>

              {showProfileMenu && (
                <div
                  id={profileMenuId}
                  className="absolute right-0 z-50 mt-3 w-44 rounded-xl border bg-white shadow-lg"
                >
                  <button
                    onClick={() => {
                      router.push("/profile");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-200"
                  >
                    View Profile
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-red-500 hover:bg-gray-200"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-w-0 flex-1 bg-gray-50 p-4 pt-24 sm:p-6 sm:pt-24 lg:p-8 lg:pt-28">
          {children}
        </main>
      </div>
    </div>
  );
}
