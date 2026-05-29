"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import TextInput from "@/components/TextInput";
import PasswordInput from "@/components/PasswordInput";
import Button from "@/components/Button";
import GoogleButton from "@/components/GoogleButton";
import Link from "next/link";
import {
  clearSavedLoginCredentials,
  getSavedLoginCredentials,
  setAuthSession,
  setSavedLoginCredentials,
} from "@/lib/authStorage";
import { Mail } from "lucide-react";
import { notify } from "@/lib/notify";
 
export default function LoginPage() {
  const router = useRouter();
 
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedCredentials = getSavedLoginCredentials();

    if (savedCredentials?.email && savedCredentials?.password) {
      setEmail(savedCredentials.email);
      setPassword(savedCredentials.password);
      setRememberMe(true);
    }
  }, []);

  const validateEmail = () => {
    const trimmed = email.trim();

    const allowedProviders = [
      "gmail",
      "yahoo",
      "hotmail",
      "outlook",
      "icloud",
      "aol",
      "protonmail",
      "zoho",
      "gmx",
      "mail",
    ];
    const allowedTLDs = ["com", "edu", "io", "org", "net", "co", "gov", "in", "ai", "app", "dev"];

    const regex = new RegExp(
      `^[a-zA-Z0-9._%+-]+@(${allowedProviders.join("|")})\\.(${allowedTLDs.join("|")})$`,
      "i"
    );
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, email: "Email is required." }));
      emailRef.current?.focus();
      return false;
    }

    if (!regex.test(trimmed)) {
      setErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address.",
      }));
      emailRef.current?.focus();
      return false;
    }

    setErrors((prev) => ({ ...prev, email: "" }));
    return true;
  };

  const validatePassword = () => {
    const trimmed = password.trim();
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!trimmed) {
      setErrors({ password: "Password is required." });
      passwordRef.current?.focus();
      return false;
    }
    if (!regex.test(trimmed)) {
      setErrors({
        password: "Password must be at least 8 characters and include uppercase, lowercase, and number.",
      });
      passwordRef.current?.focus();
      return false;
    }

    setErrors((prev) => ({ ...prev, password: "" }));
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail()) return;
    if (!validatePassword()) return;

    setLoading(true);

    try {
      const res = await fetch(apiUrl("/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          rememberMe,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        notify.error(data.message || "Login failed.");

        if (data.message === "User not found") {
          setErrors({ email: "User not found." });
        } else if (data.message === "Incorrect password") {
          setErrors({ password: "Incorrect password." });
        } else {
          setErrors({ password: "Login failed." });
        }

        setLoading(false);
        return;
      }
      if (res.ok) {
        setAuthSession(data.token, data.user.role, rememberMe);
        if (rememberMe) {
          setSavedLoginCredentials(email.trim(), password.trim());
        } else {
          clearSavedLoginCredentials();
        }

        notify.success(`Welcome, ${data.user.fullName}`);

        setTimeout(() => {
          if (data.user.role === "admin") {
            router.replace("/admin/dashboard");
          } else {
            router.replace("/services");
          }
        });
      }
    } catch (err) {
      notify.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden md:block w-1/2">
        <img
          src="/login.png"
          alt=""
          className="w-full h-full object-cover brightness-90"
        />
      </div>
      <div className="w-full md:w-1/2 flex items-center justify-center bg-pink-50 px-8 py-12">
        <div className="w-full max-w-md">
          <Logo />

          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Login to Your Account
          </h2>
          <p className="text-center text-gray-400 mb-8">
            Welcome back. Please enter your details.
          </p>

          <form className="space-y-6" onSubmit={handleLogin}>
            <TextInput
              ref={emailRef}
              label="Email Address"
              placeholder="Enter your email"
              icon={Mail}
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              onBlur={validateEmail}
              onKeyDown={(e) => {
                if (e.key === "Enter" && validateEmail()) {
                  e.preventDefault();
                  passwordRef.current?.focus();
                }
              }}
              error={errors.email}
              disabled={loading}
            />

            <PasswordInput
              ref={passwordRef}
              label="Password"
              placeholder="Enter your password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              onBlur={validatePassword}
              error={errors.password}
              disabled={loading}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="accent-pink-500"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                Remember me
              </label>
              <p className="text-right text-sm text-pink-500 hover:underline">
                <Link href="/forgot-password">Forgot password?</Link>
              </p>
            </div>

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="flex items-center my-6">
            <hr className="flex-grow border-gray-300" />
            <span className="mx-3 text-gray-500 text-sm">
              or continue with
            </span>
            <hr className="flex-grow border-gray-300" />
          </div>

          <GoogleButton />

          <p className="text-center text-sm mt-6 text-gray-500">
            Don&apos;t have an account?
            <Link href="/signup" className="text-pink-500 font-semibold ml-1">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
