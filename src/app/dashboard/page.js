"use client";  // <-- Keep the client directive

import Link from "next/link";
import { useRouter } from "next/navigation"; // Client-side navigation hook

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
  const router = useRouter();  // Client-side router hook

  return (
    <div className="flex min-h-screen bg-white">  {/* Set full white background for the whole page */}
      {/* Sidebar */}
      <aside className="w-64 bg-[#f1e9f7] p-8 flex flex-col gap-10">
        <h2 className="text-pink-500 font-bold text-xl mb-10">
          Singar Glow
        </h2>

        <ul className="space-y-6 text-gray-700 font-medium">
          {menu.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`block transition ${
                  router.pathname === item.href ? "text-pink-500" : "text-black hover:text-pink-500"
                }`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-white"> {/* Main content area with white background */}
        {/* The rest of your main content will go here */}
      </main>
    </div>
  );
}
