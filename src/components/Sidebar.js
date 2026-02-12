"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menu = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Services", href: "/services" },
  { name: "Bookings", href: "/bookings" },
  { name: "Chat", href: "/chat" },
  { name: "Reviews", href: "/reviews" },
  { name: "Payments", href: "/payments" },
  { name: "Profile", href: "/profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 p-2 bg-pink-500 text-white rounded md:hidden"
        onClick={() => setIsOpen(true)}
      >
        ☰
      </button>

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white rounded-r-xl shadow-lg
          transform transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:fixed md:flex md:flex-col md:h-screen md:p-6
        `}
      >
        <button
          className="self-end mb-4 md:hidden text-gray-500 text-lg"
          onClick={() => setIsOpen(false)}
        >
          ✕
        </button>

        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-pink-500">Singar Glow</h2>
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
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto text-center text-gray-400 text-sm">
          &copy; 2026 Singar Glow
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black opacity-25 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
