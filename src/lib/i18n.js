"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translations } from "@/lib/translations";

export const LANGUAGE_STORAGE_KEY = "singar-glow-language";

export const languages = {
  en: {
    code: "en",
    label: "English",
    shortLabel: "EN",
    nativeLabel: "English",
  },
  ne: {
    code: "ne",
    label: "Nepali",
    shortLabel: "NE",
    nativeLabel: "\u0928\u0947\u092a\u093e\u0932\u0940",
  },
};

const resources = Object.fromEntries(
  Object.entries(translations).map(([language, translation]) => [
    language,
    { translation },
  ])
);

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
      prefix: "{",
      suffix: "}",
    },
  });
}

export default i18n;
