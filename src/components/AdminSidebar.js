"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import NotificationSystem from "./NotificationSystem";

const menu = [
  { name: "Dashboard", href: "/admin/dashboard" },
  { name: "Services", href: "/admin/services" },
  { name: "Packages", href: "/admin/packages" },
  { name: "AI Sentiments", href: "/admin/ai-sentiment" },
  { name: "Chat", href: "/admin/chat" },
  { name: "Bookings", href: "/admin/bookings" },
];

export default function AdminSidebar({ children }) {
  const pathname = usePathname();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white shadow-lg flex flex-col p-6"> 
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-pink-500">
            Admin Panel
          </h2>
        </div>

        <ul className="flex flex-col gap-2">
          {menu.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`block px-4 py-3 rounded-lg font-medium transition-all
                    ${
                      isActive
                        ? "bg-pink-50 border-l-4 border-pink-500 text-pink-600 shadow-sm"
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

        <div className="mt-auto text-center text-gray-400 text-sm">
          &copy; 2026 Singar Glow Admin
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Admin Header with Notifications */}
        <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationSystem userId={userId} userRole={userRole} />
            <div className="text-sm text-gray-600">
              Welcome, Admin
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