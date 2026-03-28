import { FcGoogle } from "react-icons/fc";
import { signIn, getSession } from "next-auth/react";

export default function GoogleButton() {

  const handleGoogleLogin = async () => {
    // 🔥 Prevent auto redirect
    await signIn("google", { redirect: false });

    // Get session from NextAuth
    const session = await getSession();
    if (!session) return;

    // Call your backend
    const res = await fetch("http://localhost:5001/google-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: session.user.email,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      // ✅ Store token like normal login
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);

      // Redirect manually
      window.location.href = "/dashboard";
    } else {
      alert("Google login failed");
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="w-full border p-3 rounded-lg flex items-center justify-center gap-2 
        hover:bg-gray-100 transition text-gray-800 font-medium"
    >
      <FcGoogle size={20} />
      Continue with Google
    </button>
  );
} 