"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import TextInput from "@/components/TextInput";
import PasswordInput from "@/components/PasswordInput";
import Button from "@/components/Button";
import GoogleButton from "@/components/GoogleButton";
import {Mail} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
  e.preventDefault();

  if (!email && !password) {
    alert("Please enter email and password");
    return;
  }

  if (!email) {
    alert("Please enter your email");
    return;
  }

  if (!password) {
    alert("Please enter your password");
    return;
  }

  // For now, just show values
    alert(`Logging in with\nEmail: ${email}\nPassword: ${password}`);

    // Later: connect your API or NextAuth here
};

  return (
    <div className="min-h-screen flex bg-white">

      {/* LEFT SIDE */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-pink-50 px-8 py-12">
        <div className="w-full max-w-md">

          {/* Logo */}
          <Logo />

          {/* Title */}
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Welcome Back
          </h2>

          <p className="text-center text-gray-400 mb-8">
            Login to continue your beauty journey
          </p>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {/* Email */}
            <div>
              <label className="block text-l font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <TextInput placeholder="Enter your email" icon={Mail} value={email}   
              onChange={(e) => setEmail(e.target.value)}
              />
              
            </div>
            {/* Password */}
                <div>
                  <label className="block text-l font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <PasswordInput
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
              <p className="text-right text-sm text-pink-500 mt-1 cursor-pointer">
                Forgot Password?
              </p>
            </div>

            {/* Login Button */}
            <Button>Login</Button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <hr className="flex-grow border-gray-300" />
            <span className="mx-3 text-gray-500 text-sm">Or continue with</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          {/* Google Button */}
          <GoogleButton />

          {/* Signup */}
          <p className="text-center text-sm mt-6 text-gray-500">
            Don’t have an account? 
            <a href="/signup" className="text-pink-600 font-semibold ml-1">
              Sign Up
            </a>
          </p>

        </div>
      </div>

      {/* RIGHT IMAGE */}
      <div className="hidden md:block w-1/2">
        <img
          src="/login.jpg"
          alt="side"
          className="w-full h-full object-cover brightness-90"
        />
      </div>
    </div>
  );
}
