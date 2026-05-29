"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { apiUrl } from "@/lib/apiConfig";
import Button from "@/components/Button";
import Logo from "@/components/Logo";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        return;
      }

      try {
        const res = await fetch(apiUrl(`/verify-email?token=${encodeURIComponent(token)}`), {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setMessage(data.message || "Verification failed.");
          return;
        }

        setStatus("success");
        setMessage(data.message || "Email verified successfully. You can now log in.");
        setTimeout(() => router.replace("/login"), 2500);
      } catch {
        setStatus("error");
        setMessage("Unable to verify email. Please try again.");
      }
    }

    verifyEmail();
  }, [router, token]);

  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="min-h-screen bg-pink-50 px-6 py-12 flex items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-pink-100 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-pink-50">
          {status === "loading" && <Loader2 className="animate-spin text-pink-500" size={30} />}
          {isSuccess && <CheckCircle className="text-green-600" size={32} />}
          {isError && <XCircle className="text-red-500" size={32} />}
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          {isSuccess ? "Email Verified" : isError ? "Verification Failed" : "Checking Link"}
        </h1>
        <p className="mt-3 text-gray-600">{message}</p>

        <div className="mt-7">
          <Link href="/login">
            <Button fullWidth>Go to Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
