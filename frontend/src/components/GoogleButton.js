"use client";

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";
 
export default function GoogleButton() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await signIn("google", {
        callbackUrl: "/auth/google-callback",
      });
    } catch (error) {
      console.error(error);
      alert("Google login failed");
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
      <FcGoogle size={20} />
      {loading ? "Signing in..." : "Continue with Google"}
    </button>
  );
} 
