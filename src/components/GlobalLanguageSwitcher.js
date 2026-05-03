"use client";

import LanguageSwitcher from "./LanguageSwitcher";

export default function GlobalLanguageSwitcher() {
  return (
    <div className="fixed bottom-4 right-4 z-[90] rounded-xl border border-gray-200 bg-white/95 p-2 shadow-lg shadow-gray-200/70 backdrop-blur">
      <LanguageSwitcher compact />
    </div>
  );
}
