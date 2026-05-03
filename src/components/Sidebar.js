"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const menu = [
  { labelKey: "nav.dashboard", href: "/dashboard" },
  { labelKey: "nav.services", href: "/services" },
  { labelKey: "nav.bookings", href: "/bookings" },
  { labelKey: "nav.chat", href: "/chat" },
  { labelKey: "nav.payments", href: "/payments" },
  { labelKey: "nav.profile", href: "/profile" },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const open = typeof isOpen === "boolean" ? isOpen : internalIsOpen;
  const setOpen = setIsOpen || setInternalIsOpen;
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-24 left-5 z-60 flex h-12 w-12 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/30"
          aria-label={t("nav.openSidebar")}
        >
          <Menu size={24} aria-hidden="true" />
        </button>
      )}

      <aside
        id="user-sidebar"
        aria-label={t("nav.userNavigation")}
        aria-hidden={!open}
        className={`
          fixed top-0 left-0 z-40 h-full w-72 bg-white shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 text-xl"
          onClick={() => setOpen(false)}
          aria-label={t("nav.closeSidebar")}
        >
          <X size={22} aria-hidden="true" />
        </button>

        <div className="p-6 border-b flex justify-center items-center text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            {t("nav.quickAccess")}
          </h2>
        </div>

        <nav aria-label={t("nav.userSections")}>
        <ul className="flex flex-col gap-2 p-4">
          {menu.map((item) => {
            const isActive = pathname === item.href;
            const label = t(item.labelKey);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
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
          &copy; 2026 Singar Glow
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
