"use client";

import { apiUrl } from "@/lib/apiConfig";
import { Suspense, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Button from "@/components/Button";
import { useTranslation } from "react-i18next";

function ResetPasswordContent() {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  if (!token)
    return <p className="text-center mt-20 text-red-600" role="alert">{t("auth.invalidResetLink")}</p>;
 
  const validatePassword = () => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!newPassword) {
      setError(t("error.newPasswordRequired"));
      return false;
    }

    if (!regex.test(newPassword)) {
      setError(
        t("error.passwordWeakSpecial")
      );
      return false;
    }

    return true;
  };

  const validateConfirmPassword = () => {
    if (!confirmPassword) {
      setError(t("error.confirmNewPasswordRequired"));
      return false;
    }
    if (confirmPassword !== newPassword) {
      setError(t("error.passwordsDoNotMatch"));
      return false;
    }
    return true;
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!validatePassword()) {
      newPasswordRef.current?.focus();
      return;
    }
    if (!validateConfirmPassword()) {
      confirmPasswordRef.current?.focus();
      return;
    }

    setLoading(true);

    try { 
      const res = await fetch(apiUrl("/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (res.ok) { 
        setMessage(data.message || t("success.passwordReset"));
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(data.message || t("error.resetPasswordFailed"));
      }
    } catch {
      setError(t("error.serverTryLater"));
    } finally {
      setLoading(false);
    } 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 px-8 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">{t("auth.setNewPasswordTitle")}</h2>

        <form onSubmit={handleReset} className="space-y-4">
          {/* New Password */}
          <div className="relative">
            <input
              id="new-password"
              ref={newPasswordRef}
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.newPassword")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (validatePassword()) { 
                    confirmPasswordRef.current?.focus();
                  }
                }
              }}
              className="w-full p-3 border border-gray-300 rounded focus:outline-pink-500 text-gray-900 placeholder-gray-400"
            />
            <button
              type="button"
              className="absolute right-3 top-3 rounded text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              aria-pressed={showPassword}
              aria-controls="new-password"
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
 
          <div className="relative">
            <input
              id="confirm-new-password"
              ref={confirmPasswordRef}
              type={showConfirm ? "text" : "password"}
              placeholder={t("auth.confirmNewPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:outline-pink-500 text-gray-900 placeholder-gray-400"
            />
            <button
              type="button"
              className="absolute right-3 top-3 rounded text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? t("auth.hidePassword") : t("auth.showPassword")}
              aria-pressed={showConfirm}
              aria-controls="confirm-new-password"
            >
              {showConfirm ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>

          {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
          {message && <p className="text-green-600 text-sm" role="status">{message}</p>}
  
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? t("auth.resettingPassword") : t("auth.resetPasswordButton")}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-pink-50" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
