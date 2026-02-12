"use client";

import { useState } from "react";
import Button from "@/components/Button";

export default function ForgotPasswordPage() {
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
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5001/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage("If the email is registered, you will receive reset instructions.");
        setToken(data.token);
      } else {
        const data = await res.json();
        setError(data.message || "Something went wrong.");
      }
    } catch (err) {
      setError("Failed to send reset instructions. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 px-8 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold mb-4 text-center text-gray-900">Reset Your Password</h2>
        <form onSubmit={handleReset} className="space-y-4">
          <label className="block text-gray-500 font-semibold">Email Address</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-pink-500 text-gray-900 placeholder-gray-400"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}
          {token && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
              <p className="text-sm font-semibold text-blue-700 mb-2">Reset Token Generated:</p>
              <p className="text-xs text-blue-600 break-all font-mono bg-blue-100 p-2 rounded">{token}</p>
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      </div>
    </div>
  );
}
