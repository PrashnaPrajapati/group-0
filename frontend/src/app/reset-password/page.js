"use client";

import { apiUrl } from "@/lib/apiConfig";
import { Suspense, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Button from "@/components/Button";
 
function ResetPasswordContent() { 
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
    return <p className="text-center mt-20 text-red-600">Invalid password reset link.</p>;
 
  const validatePassword = () => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!newPassword) {
      setError("Please enter a new password.");
      return false;
    }

    if (!regex.test(newPassword)) {
      setError(
        "Password must be 8+ characters and include uppercase, lowercase, number, and special character."
      );
      return false;
    }

    return true;
  };

  const validateConfirmPassword = () => {
    if (!confirmPassword) {
      setError("Please confirm your new password.");
      return false;
    }
    if (confirmPassword !== newPassword) {
      setError("Passwords do not match.");
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
        setMessage(data.message || "Password reset successfully!");
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(data.message || "Failed to reset password. Please try again.");
      }
    } catch {
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    } 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 px-8 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Set New Password</h2>

        <form onSubmit={handleReset} className="space-y-4">
          {/* New Password */}
          <div className="relative">
            <input
              id="new-password"
              ref={newPasswordRef}
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
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
              className="w-full p-3 border border-gray-300 rounded text-gray-900 placeholder-gray-400"
            />
            <button
              type="button"
              className="absolute right-3 top-3 rounded text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            > 
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
 
          <div className="relative">
            <input
              id="confirm-new-password"
              ref={confirmPasswordRef}
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded text-gray-900 placeholder-gray-400"
            />
            <button
              type="button"
              className="absolute right-3 top-3 rounded text-gray-600"
              onClick={() => setShowConfirm(!showConfirm)}
            > 
              {showConfirm ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}
  
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
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
