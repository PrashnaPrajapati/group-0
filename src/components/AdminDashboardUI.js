"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminDashboardUI({ children }) {
  const pathname = usePathname();

  const menu = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/services", label: "Services" },
    { href: "/admimn/aisentiments", label: "AI Sentiments" },
    { href: "/admin/bookings", label: "Bookings" },
    { href: "/admin/beauticians", label: "Beauticians" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          backgroundColor: "#fff",
          padding: 20,
          boxShadow: "0 0 5px rgba(0,0,0,0.1)",
        }}
      >
        {menu.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              style={{
                padding: "10px 15px",
                borderRadius: 8,
                marginBottom: 10,
                fontWeight: 600,
                background:
                  pathname === item.href ? "#c655b5ff" : "transparent",
                color: pathname === item.href ? "#fff" : "#333",
                cursor: "pointer",
              }}
            >
              {item.label}
            </div>
          </Link>
        ))}
      </aside>

      {/* Page Content */}
      <main style={{ flex: 1, padding: 30 }}>{children}</main>
    </div>
  );
}
