"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { signIn, getSession } from "next-auth/react";
import { setAuthSession } from "@/lib/authStorage";
import { useTranslation } from "react-i18next";

export default function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const waitForSession = async () => {
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const session = await getSession();
      if (session?.user?.email) return session;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return null;
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const signInResult = await signIn("google", { redirect: false });
      if (signInResult?.error) {
        throw new Error("Google sign-in failed");
      }

      const session = await waitForSession();
      if (!session?.user?.email) {
        throw new Error("Google session not found");
      }

      const res = await fetch(apiUrl("/google-login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: session.user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Google login failed");
      }

      setAuthSession(data.token, data.user.role, true);
      window.location.assign("/services");
    } catch (error) {
      console.error(error);
      alert(t("auth.googleLoginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full border p-3 rounded-lg flex items-center justify-center gap-2 
        hover:bg-gray-100 transition text-gray-800 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <FcGoogle size={20} aria-hidden="true" />
      {loading ? t("auth.googleSigningIn") : t("auth.googleContinue")}
    </button>
  );
} 
