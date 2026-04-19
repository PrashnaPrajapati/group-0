"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
 
const menu = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Services", href: "/services" },
  { name: "Bookings", href: "/bookings" },
  { name: "Chat", href: "/chat" },
  { name: "Payments", href: "/payments" },
  { name: "Profile", href: "/profile" },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const open = typeof isOpen === "boolean" ? isOpen : internalIsOpen;
  const setOpen = setIsOpen || setInternalIsOpen;
  const pathname = usePathname();
 
  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-24 left-5 z-60 flex h-12 w-12 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/30"
          aria-label="Open sidebar"
        >
          ☰
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-72 bg-white shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      > 
        <button
          className="absolute top-4 right-4 text-gray-500 text-xl"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>

        {/* Logo */}
        <div className="p-6 border-b flex justify-center items-center text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
           Quick Access
          </h2>
        </div>

        {/* Menu */}
        <ul className="flex flex-col gap-2 p-4">
          {menu.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
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

        {/* Footer */}
        <div className="absolute bottom-4 w-full text-center text-gray-400 text-sm">
          &copy; 2026 Singar Glow
        </div>
      </aside>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
} 