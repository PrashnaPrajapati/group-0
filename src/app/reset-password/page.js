"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
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

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError("Please fill all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5001/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch {
      setError("Failed to reset password. Try again.");
    }

    setLoading(false);
  };

  if (!token)
    return <p className="text-center mt-20 text-red-600">Invalid password reset link.</p>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 px-8 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Set New Password</h2>

        <form onSubmit={handleReset} className="space-y-4">
          {/* New Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:outline-pink-500 text-gray-900 placeholder-gray-400"
            />
            <span
              className="absolute right-3 top-3 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </span>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:outline-pink-500 text-gray-900 placeholder-gray-400"
            />
            <span
              className="absolute right-3 top-3 cursor-pointer"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <EyeOff /> : <Eye />}
            </span>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 rounded hover:bg-pink-700 transition"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
