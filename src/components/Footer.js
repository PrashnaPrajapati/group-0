"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-rose-100 bg-white py-10 text-sm text-gray-600">
      <div className="max-w-8xl mx-auto px-6 grid md:grid-cols-5 gap-2">
        <div> 
          <div className="mb-2 scale-60 origin-left">
            <Logo />
          </div>
          <p>{t("footer.tagline")}</p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">{t("footer.quickLinks")}</h4>
          <ul className="space-y-3">
            <li>
              <Link href="/services" className="hover:text-pink-500">
                {t("nav.services")}
              </Link>
            </li>
            <li>
              <Link href="/packages" className="hover:text-pink-500">
                {t("nav.packages")}
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-pink-500">
                {t("auth.login")}
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-pink-500">
                {t("auth.signUp")}
              </Link>
            </li> 
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">{t("footer.services")}</h4>
          <ul className="space-y-3">
            <li>{t("footer.makeup")}</li>
            <li>{t("footer.hairStyling")}</li>
            <li>{t("footer.massage")}</li>
            <li>{t("footer.nails")}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">{t("footer.contact")}</h4>
          <div className="space-y-3">
            <p>Email: singarglow@.com</p>
            <p>Phone: 9876543210</p>
            <p>Nepal</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-4">{t("footer.support")}</h4>
          <ul className="space-y-3">
            <li>
              <Link href="/help-center" className="hover:text-pink-500">
                {t("footer.helpCenter")}
              </Link>
            </li>
            <li>
              <Link href="/booking-policy" className="hover:text-pink-500">
                {t("footer.bookingPolicy")}
              </Link>
            </li>
            <li>
              <Link href="/reviews" className="hover:text-pink-500">
                {t("footer.reviews")}
              </Link>
            </li>
            <li>
              <Link href="/faqs" className="hover:text-pink-500">
                {t("footer.faqs")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <p className="text-center mt-8 text-xs text-gray-400">
        &copy; 2026 {t("footer.rights")}
      </p>
    </footer>
  );
}
