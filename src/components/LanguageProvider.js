"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGE_STORAGE_KEY, languages } from "@/lib/i18n";
import "@/lib/i18n";

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();
  const languageCode = languages[i18n.language] ? i18n.language : "en";

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && languages[savedLanguage] && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  useEffect(() => {
    document.documentElement.lang = languageCode;
    document.documentElement.setAttribute("data-language", languageCode);
  }, [languageCode]);

  return children;
}
