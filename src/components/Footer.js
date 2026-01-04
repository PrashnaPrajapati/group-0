import Link from "next/link";
export default function Footer() {
  return (
    <footer className="bg-[#fff0f6] py-10 text-sm text-gray-600">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
        <div>
          <h4 className="text-pink-500 font-semibold mb-2">
            Singar Glow
          </h4>
          <p>Your trusted partner in beauty & wellness</p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Quick Links</h4>
          <ul className="space-y-1">
        <li>
            <Link href="/services" className="hover:text-pink-500">
            Services
            </Link>
        </li>
        <li>
            <Link href="/login" className="hover:text-pink-500">
            Login
            </Link>
        </li>
        <li>
            <Link href="/signup" className="hover:text-pink-500">
            Sign Up
            </Link>
        </li>
        </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Services</h4>
          <ul className="space-y-1">
            <li>Makeup</li>
            <li>Hair Styling</li>
            <li>Massage</li>
            <li>Nails</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Contact</h4>
          <p>Email: info@singarglow.com</p>
          <p>Phone: 9876543210</p>
          <p>Nepal</p>
        </div>
      </div>

      <p className="text-center mt-8 text-xs text-gray-400">
        © 2026 Singar Glow. All rights reserved.
      </p>
    </footer>
  );
}
