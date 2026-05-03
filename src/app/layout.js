import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import GlobalLanguageSwitcher from "@/components/GlobalLanguageSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Singar Glow",
  description: "Beauty services, bookings, packages, and customer support.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-pink-600 focus:shadow-lg"
        >
          Skip to main content
        </a>
        <LanguageProvider>
          <ToastProvider />
          <GlobalLanguageSwitcher />
          <div id="main-content">{children}</div>
        </LanguageProvider>
      </body>
    </html>
  );
}
