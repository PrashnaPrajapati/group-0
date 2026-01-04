import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";

export default function GoogleButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })} // <-- add this
      className="w-full border p-3 rounded-lg flex items-center justify-center gap-2 
        hover:bg-gray-100 transition text-gray-800 font-medium"
    >
      <FcGoogle size={20} />
      Continue with Google
    </button>
  );
}
