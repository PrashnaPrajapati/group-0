"use client";

import Link from "next/link";
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
  const confirmPasswordRef = useRef(null);
  const otherGenderRef = useRef(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState(""); 
  const [otherGender, setOtherGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateFullName = () => {
    const trimmed = fullName.trim();
    const regex = /^[A-Za-z]+([ '-][A-Za-z]+)+$/;
    if (!trimmed) {
      setErrors(prev => ({ ...prev, fullName: "Full name is required." }));
      return false;
    } else if (!regex.test(trimmed)) {
      setErrors(prev => ({ ...prev, fullName: "Enter at least 2 words, letters only." }));
      return false;
    }
    setErrors(prev => ({ ...prev, fullName: "" }));
    return true;
  };

  const validatePhone = () => {
    const trimmed = phone.replace(/\s+/g, ""); 

    if (!trimmed) {
      setErrors(prev => ({ ...prev, phone: "Phone number is required." }));
      return false;
    } 

    if (!/^\d{10}$/.test(trimmed)) {
      setErrors(prev => ({ ...prev, phone: "Phone number must be exactly 10 digits." }));
      return false;
    }

    setErrors(prev => ({ ...prev, phone: "" }));
    return true;
  };

  const validateEmail = () => {
  const trimmed = email.trim();
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;


  if (!trimmed) {
    setErrors(prev => ({ ...prev, email: "Email is required." }));
    return false;
  } else if (!regex.test(trimmed)) {
    setErrors(prev => ({ ...prev, email: "Please enter a valid email address." }));
    return false;
  }

  setErrors(prev => ({ ...prev, email: "" }));
  return true;
};


  const validatePassword = () => {
    const trimmed = password.trim();
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!trimmed) {
      setErrors(prev => ({ ...prev, password: "Password is required." }));
      return false;
    } else if (!regex.test(trimmed)) {
      setErrors(prev => ({ ...prev, password: "Password must be 8+ characters and include uppercase, lowercase, and a number." }));
      return false;
    }
    setErrors(prev => ({ ...prev, password: "" }));
    return true;
  };

  const validateConfirmPassword = () => {
  const trimmedPassword = password.trim();
  const trimmedConfirm = confirmPassword.trim();

  if (!trimmedConfirm) {
    setErrors(prev => ({ ...prev, confirmPassword: "Please confirm your password." }));
    return false;
  } else if (trimmedConfirm !== trimmedPassword) {
    setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match." }));
    return false;
  }

  setErrors(prev => ({ ...prev, confirmPassword: "" }));
  return true;
};


  const validateGender = () => {
    if (!gender) {
      setErrors(prev => ({ ...prev, gender: "Please select a gender." }));
      return false;
    } else if (gender === "other" && !otherGender.trim()) {
      setErrors(prev => ({ ...prev, otherGender: "Please specify your gender." }));
      return false;
    }
    setErrors(prev => ({ ...prev, gender: "", otherGender: "" }));
    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!validateFullName() || !validatePhone() || !validateEmail() || !validatePassword() || !validateConfirmPassword() || !validateGender()) {
      return;
    }

    setLoading(true);

    const creatingToastId = toast.info("Creating Account...", {
      position: "top-right",
      autoClose: false,
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
          confirmPassword: confirmPassword.trim(),
          gender: finalGender,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.dismiss(creatingToastId);
        toast.error(data.message || "Signup failed", {
          position: "top-right",
          autoClose: 5000,
        });
        setLoading(false);
        return;
      }

     
      toast.update(creatingToastId, {
        render: "Account Created Successfully!",
        type: "success",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      
      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (err) {
      console.error(err);
      toast.dismiss(creatingToastId);
      toast.error("Something went wrong. Please try again.", {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <ToastContainer 
      position ="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false} 
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      />
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
              disabled={loading}
            />

            {/* Phone */}
            <TextInput
            ref={phoneRef}
            placeholder="Enter your phone number"
            label="Phone Number"
            icon={Phone}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (validatePhone()) emailRef.current?.focus();
              }
            }}
            onKeyPress={(e) => {
              if (!/[0-9]/.test(e.key)) e.preventDefault();
            }}
            error={errors.phone}
            disabled={loading}
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
              disabled={loading}
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
                    confirmPasswordRef.current?.focus();
                  }
                }
              }}

              error={errors.password}
              disabled={loading}
            />

            {/* Confirm Password */}
            <PasswordInput
              ref={confirmPasswordRef}
              placeholder="Confirm your password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (validateConfirmPassword()) {
                    const firstGenderInput = document.querySelector('input[name="gender"]');
                    firstGenderInput?.focus();
                  }
                }
              }}
              error={errors.confirmPassword}
              disabled={loading}
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
                      disabled={loading}
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
                  disabled={loading}
                />
              )}
            </div>

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

            <div className="text-center text-sm mt-4 text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-pink-500 font-medium">
              Login
            </Link>
          </div>

          </form>
        </div>
      </div>
    </div>
  );
}
