"use client";

import Link from "next/link";

const menu = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Services", href: "/services" },
  { name: "Bookings", href: "/bookings" }, // You can change this to /bookings or whatever route you want
  { name: "Chat", href: "/chat" },
  { name: "Reviews", href: "/reviews" },
  { name: "Payments", href: "/payments" },
  { name: "Profile", href: "/profile" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#f1e9f7] p-8 hidden md:flex flex-col gap-10">
      <h2 className="text-pink-500 font-bold text-xl mb-10">
        Singar Glow
      </h2>

      <ul className="space-y-6 text-gray-700 font-medium">
        {menu.map((item) => (
          <li key={item.name}>
            <Link
              href={item.href}
              className="block hover:text-pink-500 transition"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
