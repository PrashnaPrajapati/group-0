"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import { getValidToken } from "@/lib/authStorage";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Gift,
  PackageCheck,
} from "lucide-react";

const DEFAULT_PACKAGE_IMAGE = "/bridal.png";
const DEFAULT_SERVICE_IMAGE = "/beauty.webp";

export default function PackageDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [pkg, setPkg] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [existingBooking, setExistingBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(getValidToken()));
  }, []);

  useEffect(() => {
    if (!params?.id) return;

    async function fetchPackage() {
      try {
        const token = getValidToken();
        const [packageRes, reviewsRes, bookingsRes] = await Promise.all([
          fetch(apiUrl(`/packages/${params.id}`)),
          fetch(apiUrl(`/packages/${params.id}/reviews`)),
          token
            ? fetch(apiUrl("/bookings/my"), {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve(null),
        ]);

        if (!packageRes.ok) throw new Error("Package not found");
        const data = await packageRes.json();
        const reviewsData = reviewsRes.ok ? await reviewsRes.json() : [];
        const bookingsData = bookingsRes?.ok ? await bookingsRes.json() : [];

        if (typeof data.services === "string") {
          data.services = JSON.parse(data.services);
        }

        setPkg(data);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        const currentBooking = Array.isArray(bookingsData)
          ? bookingsData.find(
              (booking) =>
                Number(booking.package_id) === Number(params.id) &&
                !["cancelled", "pending"].includes(booking.status)
            )
          : null;
        setExistingBooking(currentBooking || null);
      } catch (err) {
        console.error(err);
        alert("Failed to load package details");
        router.back();
      } finally {
        setLoading(false);
      }
    }

    fetchPackage();
  }, [params?.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffaf7] p-10 text-center text-gray-500">
        Loading package details...
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-[#fffaf7] p-10 text-center text-gray-500">
        Package not found
      </div>
    );
  }

  const handleBookAppointment = () => {
    if (!isLoggedIn) {
      router.push("/signup");
      return;
    }

    if (existingBooking) {
      return;
    }

    router.push(`/bookings?packageId=${pkg.id}`);
  };

  const packageImage = pkg.image
    ? apiUrl(`/uploads/packages/${pkg.image}`)
    : DEFAULT_PACKAGE_IMAGE;

  return (
    <div className={`min-h-screen bg-[#fffaf7] ${isLoggedIn ? "flex" : ""}`}>
      {isLoggedIn && <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />}

      <div className={`flex min-h-screen flex-1 flex-col ${isLoggedIn && isOpen ? "md:ml-70" : ""}`}>
        {isLoggedIn ? (
          <Navbar />
        ) : (
          <header className="sticky top-0 z-50 border-b border-rose-100/70 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
              <Link href="/home" className="scale-75 origin-left">
                <Logo />
              </Link>

              <nav className="flex items-center gap-3 text-sm sm:gap-6">
                <Link href="/login" className="font-semibold text-gray-700 hover:text-rose-600">
                  Login
                </Link>
                <Link href="/signup">
                  <Button className="py-2 text-sm shadow-sm">Sign Up</Button>
                </Link>
              </nav>
            </div>
          </header>
        )}

        <div className={`flex min-h-screen flex-col ${isLoggedIn ? "pt-20" : ""}`}>
          <main className="flex-1 px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-7xl">
              <button
                onClick={() => router.back()}
                className="mb-6 inline-flex items-center gap-2 rounded-lg border border-rose-100 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-rose-200 hover:text-rose-700"
              >
                <ArrowLeft size={16} />
                Back to Packages
              </button>

              <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
                <div className="min-w-0">
                  <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-lg border border-rose-100 bg-rose-50 shadow-sm">
                    <Image
                      src={packageImage}
                      alt={pkg.name}
                      fill
                      priority
                      className="object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-6 text-white">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                        <Gift size={14} />
                        Package
                      </span>
                      <h1 className="mt-3 text-3xl font-bold md:text-4xl">
                        {pkg.name}
                      </h1>
                    </div>
                  </div>

                  <section className="mb-6 rounded-lg border border-rose-100 bg-white p-6 shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                      Package Details
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-gray-950">
                      Complete beauty care in one booking
                    </h2>
                    <p className="mt-4 leading-7 text-gray-600">
                      {pkg.description || "No description available."}
                    </p>
                  </section>

                  <section className="mb-6 rounded-lg border border-rose-100 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                          Included Services
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-gray-950">
                          Everything in this package
                        </h2>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                        <PackageCheck size={16} />
                        {pkg.services?.length || 0} service{pkg.services?.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      {pkg.services?.map((service) => {
                        const serviceImage = service.image
                          ? apiUrl(`${service.image}`)
                          : DEFAULT_SERVICE_IMAGE;

                        return (
                          <article
                            key={service.id}
                            className="group overflow-hidden rounded-lg border border-rose-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg"
                          >
                            <div className="relative aspect-[4/3] bg-rose-50">
                              <Image
                                src={serviceImage}
                                alt={service.name}
                                fill
                                className="object-cover transition duration-500 group-hover:scale-105"
                              />
                            </div>

                            <div className="p-5">
                              <h3 className="text-lg font-semibold text-gray-950">
                                {service.name}
                              </h3>
                              <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                                {service.description}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-lg border border-rose-100 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                          Reviews
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-gray-950">Customer Reviews</h2>
                      </div>
                    </div>
                    {reviews.length === 0 ? (
                      <p className="rounded-lg bg-[#fffaf7] py-8 text-center text-gray-500">
                        No reviews yet. Be the first to review this package!
                      </p>
                    ) : (
                      <ul className="space-y-4">
                        {reviews.map((r, i) => (
                          <li key={i} className="border-b border-rose-100 pb-4 last:border-0 last:pb-0">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="font-semibold text-gray-950">{r.customer}</span>
                              <span className="flex items-center gap-1 text-sm text-amber-400">
                                {"★".repeat(r.rating)}
                                <span className="ml-1 text-gray-400">({r.rating}/5)</span>
                              </span>
                            </div>
                            {r.review && (
                              <p className="text-sm text-gray-600">{r.review}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-400">
                              {new Date(r.created_at).toLocaleDateString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>

                <aside className="w-full shrink-0">
                  <div className="sticky top-24 rounded-lg border border-rose-100 bg-white p-6 shadow-lg">
                    <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                      Booking Summary
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-gray-950">
                      Book This Package
                    </h2>

                    <div className="mt-5 space-y-3 text-sm text-gray-600">
                      <div className="flex justify-between gap-4">
                        <span>Included services</span>
                        <span className="font-semibold text-gray-900">
                          {pkg.services?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Total</span>
                        <span className="text-lg font-bold text-gray-950">
                          Rs. {pkg.price}
                        </span>
                      </div>
                    </div>

                    <hr className="my-5 border-rose-100" />

                    {existingBooking ? (
                      <div className="rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                        <p className="font-bold">You have already booked this package.</p>
                        <p className="mt-1 text-rose-600">
                          Check your dashboard for the booking date, time, and status.
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={handleBookAppointment}
                        className="flex w-full items-center justify-center gap-2 py-3"
                      >
                        <CalendarCheck size={18} />
                        {isLoggedIn ? "Book an Appointment" : "Sign Up to Book"}
                      </Button>
                    )}

                    <ul className="mt-5 space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 shrink-0 text-rose-600" size={16} />
                        One booking for multiple services
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 shrink-0 text-rose-600" size={16} />
                        Choose your preferred date and time
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 shrink-0 text-rose-600" size={16} />
                        Available for eligible salon or home appointments
                      </li>
                    </ul>
                  </div>
                </aside>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
