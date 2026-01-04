import Link from "next/link";
import Button from "./Button";
import Logo from "./Logo";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-6 py-1 flex justify-between items-center">
        
        <Link href="/" className="scale-75 origin-left">
          <Logo />
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/services" className="hover:text-pink-500">
            Services
          </Link>

          <Link href="/login" className="hover:text-pink-500">
            Login
          </Link>

          <Link href="/signup">
            <Button className="py-2 text-sm">
              Sign Up
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
