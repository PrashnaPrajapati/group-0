'use client';

import { apiUrl } from "@/lib/apiConfig";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import Image from "next/image";
import { toast } from "react-toastify";
import { clearAuthSession, getValidToken } from "@/lib/authStorage";
import {
  ArrowRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Scissors,
  Sparkles,
} from "lucide-react";

const DEFAULT_SERVICE_IMAGE = "/beauty.webp";

export default function HomePage() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [page, setPage] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const itemsPerPage = 4; 

  useEffect(() => {
    const token = getValidToken();
    setIsLoggedIn(Boolean(token));
  }, []);

  useEffect(() => {
    async function fetchServices() {
      setLoadingServices(true);
      try {
        const res = await fetch(apiUrl("/services"), { cache: "no-store" });
        if (!res.ok) return setServices([]);
        const data = await res.json();
        setServices(
          data.map((service) => ({
            ...service,
            image: service.image
              ? apiUrl(`${service.image}`)
              : DEFAULT_SERVICE_IMAGE,
          }))
        );
      } catch {
        setServices([]);
      } finally {
        setLoadingServices(false);
      }
    }
    fetchServices();
  }, []);

  const handleNext = () => {
    if ((page + 1) * itemsPerPage < services.length) setPage(page + 1);
  };

  const handleBack = () => {
    if (page > 0) setPage(page - 1);
  };

  const steps = [
    { 
      icon: Sparkles,
      title: "Choose Service", 
      desc: "Browse and select your desired beauty service" 
    },
    { 
      icon: CalendarCheck,
      title: "Pick Location & Time", 
      desc: "Choose between home service or salon visit and select your preferred time" 

    },
    { 
      icon: Scissors,
      title: "Relax & Enjoy", 
      desc: "Our experts take care of everything" 

    },
  ];

  const visibleServices = services.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const exploreServicesHref = "/services";
  const getStartedHref = isLoggedIn ? "/services" : "/signup";

  const handleLogout = () => {
    toast(
      ({ closeToast }) => (
        <div className="flex flex-col gap-3">
          <p>Are you sure you want to logout?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                clearAuthSession();
                setIsLoggedIn(false);
                router.push("/login");
                closeToast();
              }}
              className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-400"
            >
              Yes, Logout
            </button>
            <button
              type="button"
              onClick={closeToast}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeButton: false,
        closeOnClick: false,
      }
    );
  };

  return (
    <div className="bg-[#fffaf7] text-gray-900">

      <header className="sticky top-0 z-50 border-b border-rose-100/70 bg-white/90 backdrop-blur">

        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex justify-between items-center"> 
          <Link href="/home" className="scale-75 origin-left">
            <Logo />
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6 text-sm">
            {isLoggedIn ? (
              <>
                <Link href="/services" className="font-semibold text-gray-700 hover:text-rose-600">
                  Services
                </Link>
                <Link href="/packages" className="font-semibold text-gray-700 hover:text-rose-600">
                  Packages
                </Link>
                <Link href="/profile" className="hidden sm:inline font-semibold text-gray-700 hover:text-rose-600">
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="font-semibold text-gray-700 hover:text-rose-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="font-semibold text-gray-700 hover:text-rose-600">
                  Login
                </Link>
                <Link href="/signup">
                  <Button className="py-2 text-sm shadow-sm">Sign Up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/spa.png"
            alt="Beauty and wellness service"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/88 to-white/20" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#fffaf7] to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 min-h-[560px] flex items-center">
          <div className="max-w-2xl py-20">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm">
              <MapPin size={16} />
              Salon visits and doorstep beauty care
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight text-gray-950">
              Beauty services that fit your day.
            </h1> 
            
            <p className="mt-5 max-w-xl text-lg leading-8 text-gray-700">
              Book trusted makeup, hair, spa, massage, and nail services from Singar Glow in just a few clicks.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={exploreServicesHref}> 
                <Button className="inline-flex items-center gap-2 px-6 py-3 text-base shadow-lg shadow-rose-200/70">
                  Explore Services
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link
                href="/packages"
                className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white/80 px-6 py-3 font-semibold text-gray-800 shadow-sm transition hover:border-rose-300 hover:text-rose-700"
              >
                View Packages
              </Link>
            </div>

            <div className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-rose-200 rounded-lg border border-rose-100 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="px-3">
                <p className="text-xl font-bold text-gray-950">30+</p>
                <p className="text-xs font-medium text-gray-500">Services</p>
              </div>
              <div className="px-3">
                <p className="text-xl font-bold text-gray-950">Home</p>
                <p className="text-xs font-medium text-gray-500">Or salon</p>
              </div>
              <div className="px-3">
                <p className="text-xl font-bold text-gray-950">Easy</p>
                <p className="text-xs font-medium text-gray-500">Booking</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-rose-600">
                Featured Services
              </p>
              <h2 className="text-3xl font-bold text-gray-950">
                Choose your glow-up
              </h2>
              <p className="mt-2 max-w-2xl text-gray-600">
                Browse popular beauty and wellness services available for booking.
              </p>
            </div>

            <Link href="/services" className="inline-flex items-center gap-2 font-semibold text-rose-700 hover:text-rose-800">
              See all services
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {loadingServices ? (
              <p className="col-span-full text-center text-gray-500">Loading services...</p>
            ) : visibleServices.length > 0 ? (
            visibleServices.map((service, i) => (
              <Link
                href={`/services/details/${service.id}`}
                key={service.id || i} 
                className="group overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-xl"
              >
                <div className="aspect-[4/3] w-full relative overflow-hidden bg-rose-50">
                  <Image 
                  src={service.image} 
                  alt={service.name} 
                  fill 
                  className="object-cover transition duration-500 group-hover:scale-105" 
                  />
                </div>

                <div className="p-5">
                  <h3 className="font-semibold text-lg text-gray-950">
                    {service.name}
                  </h3>
                  <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-5 text-gray-500">
                    {service.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-rose-600 group-hover:text-rose-800">
                    View Details
                    <ArrowRight size={16} />
                  </span>
                   
                </div>
              </Link>
            ))
            ) : (
              <p className="col-span-full text-center text-gray-500">No services available</p>
            )}
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button 
              onClick={handleBack} 
              disabled={page === 0} 
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous services"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={handleNext} 
              disabled={(page + 1) * itemsPerPage >= services.length} 
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-950 text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next services"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-[#fffaf7] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-2 text-sm font-bold uppercase tracking-wider text-rose-600">
              How It Works
            </p>
            <h2 className="text-3xl font-bold text-gray-950">
              From browse to booked
            </h2>
            <p className="mt-2 text-gray-600">
              Book your beauty service in three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => {
              const StepIcon = step.icon;

              return (
                <div key={i} className="rounded-lg border border-rose-100 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                    <StepIcon size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-950 mb-2">
                    {i + 1}. {step.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gray-950 py-16 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-rose-300">
                Ready to Glow?
              </p>
              <h2 className="text-3xl font-bold">
                Your next beauty appointment starts here.
              </h2>
              <p className="mt-3 max-w-2xl text-gray-300"> 
                Book your first service today and get a salon-ready experience at your preferred location.
              </p>
            </div>
            
            <Link href={getStartedHref}>
              <Button className="whitespace-nowrap px-6 py-3">Get Started Now</Button>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
} 
