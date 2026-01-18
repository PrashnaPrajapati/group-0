"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import TextInput from "@/components/TextInput";
import PasswordInput from "@/components/PasswordInput";
import Button from "@/components/Button";
import GoogleButton from "@/components/GoogleButton";
import { Mail } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function LoginPage() {
  const router = useRouter();

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);


  const validateEmail = () => {
  const trimmed = email.trim();

  const allowedProviders = [
  "gmail","yahoo","hotmail","outlook","icloud",
  "aol","protonmail","zoho","gmx","mail"
];
const allowedTLDs = [
  "com","edu","io","org","net","co","gov","in","ai","app","dev"
];

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
      email: "Please enter a valid email address",
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
      password: "Password must be 8+ chars with uppercase, lowercase, and a number.",
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
    const res = await fetch("http://localhost:5001/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password: password.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {

  toast.error(data.message || "Login failed", {
    position: "top-center",
    autoClose: 5000,
  });

  if (data.message === "User not found") {
    setErrors({ email: "No account found with this email." });
  } else if (data.message === "Incorrect password") {
    setErrors({ password: "Incorrect password." });
  } else {
    setErrors({ password: "Login failed." });
  }

  setLoading(false);
  return;
}
    if (res.ok) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.user.role);

  toast.success(`Welcome, ${data.user.fullName}`, {
    position: "top-center",
    autoClose: 2000,
  });

  setTimeout(() => {
    if (data.user.role === "admin") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/dashboard");
    }
  }, 2000);
}

  } catch (err) {
    toast.error("Server error. Please try again.", {
      position: "top-center",
      autoClose: 5000,
    });
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen flex bg-white">
      <ToastContainer />

      {/* LEFT IMAGE */}
      <div className="hidden md:block w-1/2">
        <img
          src="/login.png"
          alt="side"
          className="w-full h-full object-cover brightness-90"
        />
      </div>

      {/* RIGHT FORM */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-pink-50 px-8 py-12">
        <div className="w-full max-w-md">
          <Logo />

          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-center text-gray-400 mb-8">
            Login to continue your beauty journey
          </p>

          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Email */}
            <TextInput
              ref={emailRef}
              label="Email Address"
              placeholder="Enter your email"
              icon={Mail}
              value={email}
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

            {/* Password */}
            <PasswordInput
              ref={passwordRef}
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={validatePassword}
              error={errors.password}
              disabled={loading}
            />

            <p className="text-right text-sm text-pink-500 hover:underline">
              <a href="/forgot-password">Forgot Password?</a>
            </p>

            <Button
              type="submit"
              fullWidth
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <hr className="flex-grow border-gray-300" />
            <span className="mx-3 text-gray-500 text-sm">
              Or continue with
            </span>
            <hr className="flex-grow border-gray-300" />
          </div>

          <GoogleButton />

          <p className="text-center text-sm mt-6 text-gray-500">
            Don’t have an account?
            <a href="/signup" className="text-pink-600 font-semibold ml-1">
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
