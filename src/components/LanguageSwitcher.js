"use client";

import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGUAGE_STORAGE_KEY, languages } from "@/lib/i18n";

export default function LanguageSwitcher({ compact = false, id = "language-switcher" }) {
  const { i18n, t } = useTranslation();
  const languageCode = languages[i18n.language] ? i18n.language : "en";
  const options = Object.values(languages);
  const switcherId = compact ? `${id}-compact` : id;
  const setLanguageCode = (nextLanguageCode) => {
    if (!languages[nextLanguageCode]) return;

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguageCode);
    i18n.changeLanguage(nextLanguageCode);
  };

  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <Languages className="text-gray-500" size={18} aria-hidden="true" />
      )}
      <label htmlFor={switcherId} className="sr-only">
        {t("language.select")}
      </label>
      <select
        id={switcherId}
        value={languageCode}
        onChange={(event) => setLanguageCode(event.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
        aria-label={t("language.select")}
      >
        {options.map((language) => (
          <option key={language.code} value={language.code} lang={language.code}>
            {compact ? language.shortLabel : `${language.nativeLabel} (${language.shortLabel})`}
          </option>
        ))}
      </select>
    </div>
  );
}
