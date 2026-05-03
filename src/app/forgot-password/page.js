"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useState } from "react";
import Button from "@/components/Button";
import { useTranslation } from "react-i18next";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email) {
      setError(t("error.forgotEmailRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || t("success.resetInstructionsSent"));
        setToken(data.token);
      } else {
        setError(data.message || t("error.resetGeneric"));
      }
    } catch (err) {
      setError(t("error.resetInstructionsFailed"));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 px-8 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold mb-4 text-center text-gray-900">{t("auth.resetPasswordTitle")}</h2>
        <form onSubmit={handleReset} className="space-y-4">
          <label htmlFor="forgot-email" className="block text-gray-500 font-semibold">{t("auth.emailAddress")}</label>
          <input
            id="forgot-email"
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "forgot-email-error" : undefined}
            className="w-full p-3 border border-gray-300 rounded focus:outline-pink-500 text-gray-900 placeholder-gray-400"
          />
          {error && <p id="forgot-email-error" className="text-red-600 text-sm" role="alert">{error}</p>}
          {message && <p className="text-green-600 text-sm" role="status">{message}</p>}
          {token && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
              <p className="text-sm font-semibold text-blue-700 mb-2">{t("auth.resetTokenGenerated")}</p>
              <p className="text-xs text-blue-600 break-all font-mono bg-blue-100 p-2 rounded">{token}</p>
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? t("auth.resetPasswordSending") : t("auth.resetPasswordSend")}
          </Button>
        </form>
      </div>
    </div>
  );
}
