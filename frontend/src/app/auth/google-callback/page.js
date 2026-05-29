"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/apiConfig";
import { setAuthSession } from "@/lib/authStorage";
import Logo from "@/components/Logo";

export default function GoogleCallbackPage() {
  const [message, setMessage] = useState("Completing Google sign-in...");

  useEffect(() => {
    async function finishGoogleLogin() {
      try {
        const session = await getSession();

        if (!session?.user?.email) {
          setMessage("Google session was not found. Please try again.");
          setTimeout(() => window.location.assign("/login"), 1800);
          return;
        }

        const res = await fetch(apiUrl("/google-login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: session.user.email }),
        });
        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Google login failed. Please try again.");
          setTimeout(() => window.location.assign("/login"), 1800);
          return;
        }

        setAuthSession(data.token, data.user.role, true);
        window.location.replace(data.user.role === "admin" ? "/admin/dashboard" : "/services");
      } catch {
        setMessage("Google login failed. Please try again.");
        setTimeout(() => window.location.assign("/login"), 1800);
      }
    }

    finishGoogleLogin();
  }, []);

  return (
    <div className="min-h-screen bg-pink-50 px-6 py-12 flex items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-pink-100 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Loader2 className="mx-auto mb-5 animate-spin text-pink-500" size={34} />
        <h1 className="text-2xl font-bold text-gray-900">Google Sign-In</h1>
        <p className="mt-3 text-gray-600">{message}</p>
      </div>
    </div>
  );
}
