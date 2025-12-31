"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import TextInput from "@/components/TextInput";
import PasswordInput from "@/components/PasswordInput";
import Button from "@/components/Button";
import { User, Phone, Mail } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function SignupPage() {
  const router = useRouter();

  const fullNameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const otherGenderRef = useRef(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState(""); 
  const [otherGender, setOtherGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateFullName = () => {
    const trimmed = fullName.trim();
    const regex = /^[A-Za-z]+([ '-][A-Za-z]+)+$/;
    if (!trimmed) {
      setErrors({ fullName: "Full name is required." });
      return false;
    } else if (!regex.test(trimmed)) {
      setErrors({ fullName: "Enter at least 2 words, letters only." });
      return false;
    }
    setErrors(prev => ({ ...prev, fullName: "" }));
    return true;
  };

  const validatePhone = () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setErrors({ phone: "Phone number is required." });
      return false;
    } else if (!/^\d+$/.test(trimmed)) {
      setErrors({ phone: "Phone number must contain digits only." });
      return false;
    } else if (trimmed.length !== 10) {
      setErrors({ phone: "Phone number must be exactly 10 digits." });
      return false;
    }
    setErrors(prev => ({ ...prev, phone: "" }));
    return true;
  };

  const validateEmail = () => {
    const trimmed = email.trim();
    const regex = /^[A-Za-z0-9._-]{2,}@gmail\.com$/;
    if (!trimmed) {
      setErrors({ email: "Email is required." });
      return false;
    } else if (!regex.test(trimmed)) {
      setErrors({ email: "Email must be valid and end with @gmail.com." });
      return false;
    }
    setErrors(prev => ({ ...prev, email: "" }));
    return true;
  };

  const validatePassword = () => {
    const trimmed = password.trim();
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!trimmed) {
      setErrors({ password: "Password is required." });
      return false;
    } else if (!regex.test(trimmed)) {
      setErrors({
        password: "Password must be 8+ characters and include uppercase, lowercase, and a number.",
      });
      return false;
    }
    setErrors(prev => ({ ...prev, password: "" }));
    return true;
  };

  const validateGender = () => {
    if (!gender) {
      setErrors({ gender: "Please select a gender." });
      return false;
    } else if (gender === "other" && !otherGender.trim()) {
      setErrors({ otherGender: "Please specify your gender." });
      return false;
    }
    setErrors(prev => ({ ...prev, gender: "", otherGender: "" }));
    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!validateFullName() || !validatePhone() || !validateEmail() || !validatePassword() || !validateGender()) {
      return;
    }

    setLoading(true);

    const creatingToastId = toast.info("Creating Account...", {
      position: "top-left",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      progress: undefined,
    });

    const formattedName = fullName.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const finalGender = gender === "other" ? otherGender.trim() : gender;

    try {
      const res = await fetch("http://localhost:5001/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formattedName,
          phone: phone.trim(),
          email: email.trim(),
          password: password.trim(),
          gender: finalGender,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.dismiss(creatingToastId);
        toast.error(data.message || "Signup failed", {
          position: "top-center",
          autoClose: 5000,
        });
        setLoading(false);
        return;
      }

     
      toast.update(creatingToastId, {
        render: "Account Created Successfully!",
        type: "success",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      
      setTimeout(() => {
        router.push("/login");
      }, 5000);

    } catch (err) {
      console.error(err);
      toast.dismiss(creatingToastId);
      toast.error("Something went wrong. Please try again.", {
        position: "top-center",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <ToastContainer 
      position ="top-left"/>
      {/* Left Image */}
      <div className="hidden md:block w-1/2">
        <img
          src="/signup.png"
          
          className="w-full h-full object-cover brightness-90"
        />
      </div>

      {/* Right Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-pink-50 px-8 py-12">
        <div className="w-full max-w-md">
          <Logo />
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Create Account
          </h2>
          <p className="text-center text-gray-500 mt-1 mb-6">
            Join us and start your beauty journey
          </p>

          <form className="space-y-5" onSubmit={handleSignup}>

            {/* Full Name */}
            <TextInput
              ref={fullNameRef}
              placeholder="Enter your full name"
              label="Full Name"
              icon={User}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (validateFullName()) phoneRef.current?.focus();
                }
              }}
              error={errors.fullName}
            />

            {/* Phone */}
            <TextInput
              ref={phoneRef}
              placeholder="Enter your phone number"
              label="Phone Number"
              icon={Phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (validatePhone()) emailRef.current?.focus();
                }
              }}
              error={errors.phone}
            />

            {/* Email */}
            <TextInput
              ref={emailRef}
              placeholder="Enter your email"
              label="Email Address"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (validateEmail()) passwordRef.current?.focus();
                }
              }}
              error={errors.email}
            />

            {/* Password */}
            <PasswordInput
              ref={passwordRef}
              placeholder="Create a password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (validatePassword()) {
                   
                    const firstGenderInput = document.querySelector('input[name="gender"]');
                    firstGenderInput?.focus();
                  }
                }
              }}
              error={errors.password}
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
              {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}

              {gender === "other" && (
                <TextInput
                  ref={otherGenderRef}
                  placeholder="Please specify"
                  label="Specify Gender"
                  value={otherGender}
                  onChange={(e) => setOtherGender(e.target.value)}
                  error={errors.otherGender}
                />
              )}
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Please wait..." : "Create Account"}
            </Button>

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
