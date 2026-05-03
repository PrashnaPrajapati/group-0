"use client";

import { apiUrl } from "@/lib/apiConfig";
import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import TextInput from "@/components/TextInput";
import PasswordInput from "@/components/PasswordInput";
import Button from "@/components/Button";
import GoogleButton from "@/components/GoogleButton"; 
import { User, Phone, Mail } from "lucide-react";
import { toast } from "react-toastify";
import { notify } from "@/lib/notify";
import { useTranslation } from "react-i18next";

export default function SignupPage() {
  const router = useRouter();
  const { t } = useTranslation();

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
      setErrors(prev => ({ ...prev, fullName: t("error.fullNameRequired") }));
      return false;
    } else if (!regex.test(trimmed)) {
      setErrors(prev => ({ ...prev, fullName: t("error.fullNameInvalid") }));
      return false;
    }
    setErrors(prev => ({ ...prev, fullName: "" }));
    return true;
  };

  const validatePhone = () => {
    const trimmed = phone.replace(/\s+/g, ""); 

    if (!trimmed) {
      setErrors(prev => ({ ...prev, phone: t("error.phoneRequired") }));
      return false;
    } 

    if (!/^\d{10}$/.test(trimmed)) {
      setErrors(prev => ({ ...prev, phone: t("error.phoneInvalid") }));
      return false;
    }

    setErrors(prev => ({ ...prev, phone: "" }));
    return true;
  };

  const validateEmail = () => {
  const trimmed = email.trim();
 
  const allowedProviders = [
    "gmail", "yahoo", "hotmail", "outlook", "icloud",
    "aol", "protonmail", "zoho", "gmx", "mail"
  ];
 
  const allowedTLDs = [
    "com", "edu", "io", "org", "net", "co", "gov",
    "in", "ai", "app", "dev"
  ];
 
  const regex = new RegExp(
    `^[a-zA-Z0-9._%+-]+@(${allowedProviders.join("|")})\\.(${allowedTLDs.join("|")})$`,
    "i"  
  );
 
  if (!trimmed) {
    setErrors(prev => ({ ...prev, email: t("error.emailRequired") }));
    emailRef.current?.focus();
    return false;
  }
 
  if (!regex.test(trimmed)) {
    setErrors(prev => ({
      ...prev,
      email: t("error.emailInvalid")
    }));
    emailRef.current?.focus();
    return false;
  }
 
  setErrors(prev => ({ ...prev, email: "" }));
  return true;
}; 

  const validatePassword = () => {
    const trimmed = password.trim();
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!trimmed) {
      setErrors(prev => ({ ...prev, password: t("error.passwordRequired") }));
      return false;
    } else if (!regex.test(trimmed)) {
      setErrors(prev => ({ ...prev, password: t("error.passwordWeak") }));
      return false;
    }
    setErrors(prev => ({ ...prev, password: "" }));
    return true;
  };

  const validateConfirmPassword = () => {
  const trimmedPassword = password.trim();
  const trimmedConfirm = confirmPassword.trim();

  if (!trimmedConfirm) {
    setErrors(prev => ({ ...prev, confirmPassword: t("error.confirmPasswordRequired") }));
    return false;
  } else if (trimmedConfirm !== trimmedPassword) {
    setErrors(prev => ({ ...prev, confirmPassword: t("error.passwordsDoNotMatch") }));
    return false;
  }

  setErrors(prev => ({ ...prev, confirmPassword: "" }));
  return true;
}; 
  const validateGender = () => {
    if (!gender) {
      setErrors(prev => ({ ...prev, gender: t("error.genderRequired") }));
      return false;
    } else if (gender === "other" && !otherGender.trim()) {
      setErrors(prev => ({ ...prev, otherGender: t("error.otherGenderRequired") }));
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

    const creatingToastId = toast.info(t("auth.creatingAccount"), {
      position: "top-center",
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
      const res = await fetch(apiUrl("/signup"), {
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
        notify.error(data.message || t("error.signupFailed"));
        setLoading(false);
        return;
      } 
     
      toast.update(creatingToastId, {
        render: data.message || t("auth.accountCreated"),
        type: "success", 
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      router.push("/login");

    } catch (err) {
      console.error(err);
      toast.dismiss(creatingToastId);
      notify.error(t("error.genericTryAgain"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden md:block w-1/2">
        <img
          src="/signup.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover brightness-90"
        />
      </div> 
      <div className="w-full md:w-1/2 flex items-center justify-center bg-pink-50 px-8 py-12">
        <div className="w-full max-w-md">
          <Logo />
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            {t("auth.createAccountTitle")}
          </h2>
          <p className="text-center text-gray-500 mt-1 mb-6">
            {t("auth.createAccountSubtitle")}
          </p>

          <form className="space-y-5" onSubmit={handleSignup}>
 
            <TextInput
              ref={fullNameRef}
              placeholder={t("auth.fullNamePlaceholder")}
              label={t("auth.fullName")}
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
 
            <TextInput
            ref={phoneRef}
            placeholder={t("auth.phonePlaceholder")}
            label={t("auth.phoneNumber")}
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
 
            <TextInput
              ref={emailRef}
              placeholder={t("auth.emailPlaceholder")}
              label={t("auth.emailAddress")}
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
 
            <PasswordInput
              ref={passwordRef}
              placeholder={t("auth.createPasswordPlaceholder")}
              label={t("auth.password")}
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
 
            <PasswordInput
              ref={confirmPasswordRef}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              label={t("auth.confirmPassword")}
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
 
            <fieldset>
              <legend className="text-sm font-medium text-gray-700">{t("auth.gender")}</legend>
              <div className="flex items-center gap-5 mt-2">
                {[
                  { value: "female", label: t("auth.genderFemale") },
                  { value: "male", label: t("auth.genderMale") },
                  { value: "other", label: t("auth.genderOther") },
                ].map((g) => (
                  <label key={g.value} className="flex items-center gap-2 text-gray-700">
                    <input
                      type="radio"
                      name="gender"
                      value={g.value}
                      className="accent-pink-500"
                      checked={gender === g.value}
                      onChange={(e) => setGender(e.target.value)}
                      disabled={loading}
                    />
                    {g.label}
                  </label>
                ))}
              </div>
              {errors.gender && <p className="text-red-500 text-sm mt-1" role="alert">{errors.gender}</p>}

              {gender === "other" && (
                <TextInput
                  ref={otherGenderRef}
                  placeholder={t("auth.specifyGenderPlaceholder")}
                  label={t("auth.specifyGender")}
                  value={otherGender}
                  onChange={(e) => setOtherGender(e.target.value)}
                  error={errors.otherGender}
                  disabled={loading}
                />
              )}
            </fieldset>

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
            </Button>

            <div className="flex items-center my-2">
              <hr className="flex-grow border-gray-300" />
              <span className="mx-3 text-gray-500 text-sm">
                {t("auth.orContinueWith")}
              </span>
              <hr className="flex-grow border-gray-300" />
            </div>

            <GoogleButton />

            <div className="text-center text-sm mt-4 text-gray-500">
            {t("auth.haveAccount")}{" "}
            <Link href="/login" className="text-pink-500 font-semibold ml-1">
              {t("auth.login")}
            </Link>
          </div> 
          </form>
        </div>
      </div>
    </div>
  );
}
