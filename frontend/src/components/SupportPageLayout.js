import Link from "next/link"; 
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import { ArrowRight } from "lucide-react"; 

export default function SupportPageLayout({
  eyebrow,
  title,
  description,
  children, 
}) { 
  return (
    <div className="min-h-screen bg-[#fffaf7] text-gray-900">
      <header className="sticky top-0 z-50 border-b border-rose-100/70 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex justify-between items-center">
          <Link href="/home" className="scale-75 origin-left">
            <Logo />
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6 text-sm font-semibold">
            <Link href="/services" className="text-gray-700 hover:text-rose-600">
              Services
            </Link>
            <Link href="/packages" className="text-gray-700 hover:text-rose-600">
              Packages
            </Link>
            <Link href="/login" className="text-gray-700 hover:text-rose-600">
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-rose-100 bg-white">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-rose-50 to-transparent lg:block" />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-tight text-gray-950 md:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
                {description}
              </p>
            </div>

            <div className="rounded-lg border border-rose-100 bg-[#fffaf7] p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-rose-600">
                Quick path
              </p>
              <h2 className="mt-2 text-xl font-bold text-gray-950">
                Need help booking?
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Start with services, compare packages, or read common answers before contacting support.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href="/services"
                  className="inline-flex items-center justify-between rounded-lg bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  Browse services
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/faqs"
                  className="inline-flex items-center justify-between rounded-lg border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-rose-300 hover:text-rose-700"
                >
                  Read FAQs
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#fffaf7] px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
