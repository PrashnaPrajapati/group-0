"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import NotificationSystem from "./NotificationSystem";
import { getToken } from "@/lib/authStorage";
import { Menu, MessageCircle, X } from "lucide-react";
import { apiUrl } from "@/lib/apiConfig";
import { useTranslation } from "react-i18next";

const menu = [
  { labelKey: "nav.dashboard", href: "/admin/dashboard" },
  { labelKey: "nav.users", href: "/admin/users" },
  { labelKey: "nav.services", href: "/admin/services" },
  { labelKey: "nav.packages", href: "/admin/packages" },
  { labelKey: "nav.aiSentiments", href: "/admin/ai-sentiment" },
  { labelKey: "nav.chat", href: "/admin/chat" },
  { labelKey: "nav.bookings", href: "/admin/bookings" },
  { labelKey: "nav.payments", href: "/admin/payments" },
];

export default function AdminSidebar({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const showChatBadge = chatUnreadCount > 0;
  const { t } = useTranslation();

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.id);
        setUserRole(decoded.role);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

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

  const sidebar = (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-24 left-5 z-60 flex h-12 w-12 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/30"
          aria-label={t("admin.openSidebar")}
        >
          <Menu size={24} aria-hidden="true" />
        </button>
      )}

      <aside
        id="admin-sidebar"
        aria-label={t("admin.navigation")}
        aria-hidden={!isOpen}
        className={`
          fixed top-0 left-0 z-40 h-full w-72 bg-white shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 text-xl"
          onClick={() => setIsOpen(false)}
          aria-label={t("admin.closeSidebar")}
        >
          <X size={22} aria-hidden="true" />
        </button>

        <div className="p-6 border-b flex justify-center items-center text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            {t("admin.panel")}
          </h2>
        </div>

        <nav aria-label={t("admin.sections")}>
        <ul className="flex flex-col gap-2 p-4">
          {menu.map((item) => {
            const isActive = pathname === item.href;
            const label = t(item.labelKey);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`block px-4 py-3 rounded-lg font-medium transition
                    ${
                      isActive
                        ? "bg-pink-50 border-l-4 border-pink-500 text-pink-600"
                        : "text-gray-700 hover:bg-pink-50 hover:text-pink-500"
                    }
                  `}
                >
                  {label}
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
          aria-hidden="true"
        />
      )}
    </>
  );

  if (!children) {
    return sidebar;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {sidebar}

      <div className="flex-1 flex flex-col">
        {/* Admin Header with Notifications */}
        <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">{t("admin.dashboard")}</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationSystem userId={userId} userRole={userRole} />
            <button
              onClick={() => router.push("/admin/chat")}
              className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full"
              aria-label={showChatBadge ? t("chat.openAdminWithCount", { count: chatUnreadCount }) : t("chat.openAdmin")}
            >
              <MessageCircle size={24} aria-hidden="true" />
              {showChatBadge && (
                <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold leading-none text-white ring-2 ring-white" aria-hidden="true">
                  {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                </span>
              )}
            </button>
            <div className="text-sm text-gray-600">
              {t("admin.welcome")}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
