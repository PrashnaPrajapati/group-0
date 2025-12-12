"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import TextInput from "@/components/TextInput";
import PasswordInput from "@/components/PasswordInput";
import Button from "@/components/Button";
import { User, Phone, Mail } from "lucide-react";

export default function SignupPage() {
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [gender, setGender] = useState(""); 
    

    const handleSignup = (e) => {
    e.preventDefault();

    if (!fullName || !phone || !email || !password || !gender) {
        alert("Please fill in all fields");
        return;
    }

    alert(`Signing up with:
    Full Name: ${fullName}
    Phone: ${phone}
    Email: ${email}
    Password: ${password}
    Gender: ${gender}`);
    };
  return (
    <div className="min-h-screen flex bg-white">

      {/* Left Image */}
      <div className="hidden md:block w-1/2">
        <img
          src="/signup.jpg"
          alt="side"
          className="w-full h-full object-cover brightness-90"
        />
      </div>

      {/* Right Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-pink-50 px-8 py-12">
        <div className="w-full max-w-md">

          {/* Logo + Heading */}
          <Logo />

          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Create Account
          </h2>

          <p className="text-center text-gray-500 mt-1 mb-6">
            Join us and start your beauty journey
          </p>

          {/* Form */}
          <form className="space-y-5"onSubmit={handleSignup}>

            {/* Full Name */}
            <TextInput placeholder="Enter your full name" 
            label="Full Name" 
            icon={User} 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}/>

            {/* Phone Number */}
            <TextInput placeholder="Enter your phone number" 
            label="Phone Number" 
            icon={Phone} 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            />

            {/* Email */}
            <TextInput placeholder="Enter your email" 
            label="Email Address" 
            type="email" 
            icon={Mail}  
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            />

            {/* Password */}
            <PasswordInput placeholder="Create a password" 
            label="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            />

            {/* Gender */}
            <div>
            <label className="text-sm font-medium text-gray-700">Gender</label>
            <div className="flex items-center gap-5 mt-2">
                {["female", "male", "other"].map((g) => (
                <label key={g} className="flex items-center gap-2 text-gray-700">
                    <input
                    type="radio"
                    name="gender"
                    value={g}
                    className="accent-pink-500"
                    checked={gender === g}
                    onChange={(e) => setGender(e.target.value)}
                    />
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                </label>
                ))}
            </div>
            </div>

            {/* Submit Button */}
            <Button>Create Account</Button>

            {/* Login Link */}
            <div className="text-center text-sm mt-4 text-gray-500">
              Already have an account?{" "}
              <a href="/login" className="text-pink-500 font-medium">
                Login
              </a>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
