"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
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
  Clock,
  MapPin,
  Star,
} from "lucide-react";

const DEFAULT_SERVICE_IMAGE = "/beauty.webp";

export default function ServiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [service, setService] = useState(null);
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
    const token = getValidToken();

    Promise.all([
      fetch(apiUrl(`/services/${params.id}`)).then((res) => {
        if (!res.ok) throw new Error("Service not found");
        return res.json();
      }),
      fetch(apiUrl(`/services/${params.id}/reviews`)).then((res) =>
        res.ok ? res.json() : []
      ),
      token
        ? fetch(apiUrl("/bookings/my"), {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => (res.ok ? res.json() : []))
        : Promise.resolve([]),
    ])
      .then(([serviceData, reviewsData, bookingsData]) => {
        setService(serviceData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        const currentBooking = Array.isArray(bookingsData)
          ? bookingsData.find(
              (booking) =>
                Number(booking.service_id) === Number(params.id) &&
                !["cancelled", "pending", "missed"].includes(booking.status)
            )
          : null;
        setExistingBooking(currentBooking || null);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.back();
      });
  }, [params?.id, router]);

  if (loading)
    return (
      <div className="min-h-screen bg-[#fffaf7] p-10 text-center text-gray-500">
        Loading service details...
      </div>
    );
  if (!service)
    return (
      <div className="min-h-screen bg-[#fffaf7] p-10 text-center text-gray-500">
        Service not found
      </div>
    );

  const durationMins = service.duration
    ? String(service.duration).replace(/\D/g, "")
    : null;

  const handleBookAppointment = () => {
    if (!isLoggedIn) {
      router.push("/signup");
      return;
    }

    if (existingBooking) {
      return;
    }

    router.push(`/bookings?serviceId=${service.id}`);
  };

  const serviceImage = service.image
    ? apiUrl(`${service.image}`)
    : DEFAULT_SERVICE_IMAGE;

  return (
    <div className={`min-h-screen bg-[#fffaf7] ${isLoggedIn ? "flex" : ""}`}>
      {isLoggedIn && <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />}
      <div className={`flex-1 flex flex-col min-h-screen ${isLoggedIn && isOpen ? "md:ml-70" : ""}`}>
        {isLoggedIn ? (
          <Navbar />
        ) : (
          <header className="sticky top-0 z-50 border-b border-rose-100/70 bg-white/90 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex justify-between items-center">
              <Link href="/home" className="scale-75 origin-left">
                <Logo />
              </Link>

              <nav className="flex items-center gap-3 sm:gap-6 text-sm">
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
        <div className={`flex flex-col min-h-screen ${isLoggedIn ? "pt-20" : ""}`}>
          <main className="flex-1 px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-7xl">

            <button
              onClick={() => router.back()}
              className="mb-6 inline-flex items-center gap-2 rounded-lg border border-rose-100 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-rose-200 hover:text-rose-700"
            >
              <ArrowLeft size={16} />
              Back to Services
            </button>

            <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">

              <div className="min-w-0">

                <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-lg border border-rose-100 bg-rose-50 shadow-sm">
                  <Image
                    src={serviceImage}
                    fill 
                    priority
                    alt=""
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
                    <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                      Service
                    </span>
                    <h1 className="mt-3 text-3xl font-bold md:text-4xl">
                      {service.name}
                    </h1>
                  </div>
                </div>

                <div className="mb-6 rounded-lg border border-rose-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                      Service Details
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-gray-950">
                      {service.name}
                    </h2>
                  </div>
                  <div className="shrink-0 rounded-lg bg-[#fffaf7] px-5 py-4 md:text-right">
                    <span className="text-2xl font-bold text-gray-900">
                      Rs. {service.price}
                    </span>
                    <p className="text-sm text-gray-500">per session</p>
                  </div>
                  </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-600">
                  {service.review_count > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2">
                      <Star size={15} className="fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-gray-800">{service.rating}</span>
                      <span className="text-gray-400">({service.review_count} {service.review_count === 1 ? "review" : "reviews"})</span>
                    </span>
                  )}
                  {durationMins && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
                      <Clock size={15} />
                      {durationMins} minutes
                    </span>
                  )}
                  {service.gender && (
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-2 font-semibold capitalize text-rose-700">
                      {service.gender}
                    </span>
                  )}
                </div>

                  <div className="mt-6 border-t border-rose-100 pt-6">
                  <h2 className="text-lg font-semibold text-gray-950 mb-2">Description</h2>
                  <p className="leading-7 text-gray-600">
                    {service.description || "No description available."}
                  </p>
                  </div>
                </div>

                <div className="rounded-lg border border-rose-100 bg-white p-6 shadow-sm">
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
                      No reviews yet. Be the first to review this service!
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {reviews.map((r, i) => (
                        <li key={i} className="border-b border-rose-100 pb-4 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-950">{r.customer}</span>
                            <span className="flex items-center gap-1 text-amber-400 text-sm">
                              {"★".repeat(r.rating)}
                              <span className="text-gray-400 ml-1">({r.rating}/5)</span>
                            </span>
                          </div>
                          {r.review && (
                            <p className="text-gray-600 text-sm">{r.review}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(r.created_at).toLocaleDateString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="w-full shrink-0">
                <div className="sticky top-24 rounded-lg border border-rose-100 bg-white p-6 shadow-lg">
                  <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                    Booking Summary
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-gray-950 mb-5">Book This Service</h2>

                  <div className="flex justify-between text-gray-600 text-sm mb-2">
                    <span>Service Price</span>
                    <span className="font-semibold text-gray-800">Rs. {service.price}</span>
                  </div>

                  <hr className="border-rose-100 my-4" />

                  <div className="flex justify-between text-gray-900 font-bold text-base mb-5">
                    <span>Total</span>
                    <span>Rs. {service.price}</span>
                  </div>

                  {existingBooking ? (
                    <div className="mb-5 rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                      <p className="font-bold">You have already booked this service.</p>
                      <p className="mt-1 text-rose-600">
                        Check your dashboard for the booking date, time, and status.
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleBookAppointment}
                      className="mb-5 flex w-full items-center justify-center gap-2 py-3"
                    >
                      <CalendarCheck size={18} />
                      {isLoggedIn ? "Book Appointment" : "Sign Up to Book"}
                    </Button>
                  )}

                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-rose-600" size={16} />
                      Choose your preferred date and time
                    </li>
                    <li className="flex items-start gap-2">
                      <MapPin className="mt-0.5 shrink-0 text-rose-600" size={16} />
                      Select home or salon location
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-rose-600" size={16} />
                      Get instant booking confirmation
                    </li>
                  </ul>
                </div>
              </div>

            </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
