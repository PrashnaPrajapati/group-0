"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Sidebar */}
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

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>

    </div>
  );
}