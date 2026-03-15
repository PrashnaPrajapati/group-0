import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="bg-[#fff7fa] py-10 text-sm text-gray-600">
      <div className="max-w-8xl mx-auto px-6 grid md:grid-cols-5 gap-2">
        
        <div>
          <div className="mb-2 scale-60 origin-left">
            <Logo />
          </div>
          <p>Your trusted partner in beauty & wellness</p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Quick Links</h4>
          <ul className="space-y-3">
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
            <li>
              <Link href="/bookings" className="hover:text-pink-500">
                Bookings
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Services</h4>
          <ul className="space-y-3">
            <li>Makeup</li>
            <li>Hair Styling</li>
            <li>Massage</li>
            <li>Nails</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Contact</h4>
          <div className="space-y-3">
            <p>Email: singarglow@.com</p>
            <p>Phone: 9876543210</p>
            <p>Nepal</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Support</h4>
          <ul className="space-y-3">
             <li className="hover:text-pink-500">📞 Help Center</li>
            <li className="hover:text-pink-500">📄 Booking Policy</li>
            <li className="hover:text-pink-500">⭐ Reviews</li>
            <li className="hover:text-pink-500">❓ FAQs</li>
          </ul>
        </div>
      </div>

      <p className="text-center mt-8 text-xs text-gray-400">
        © 2026 Singar Glow. All rights reserved.
      </p>
    </footer>
  );
}
