"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; 
import Image from "next/image";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import { getValidToken } from "@/lib/authStorage";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  ListChecks,
  Search,
  Sparkles,
} from "lucide-react";

const DEFAULT_SERVICE_IMAGE = "/beauty.webp";

export default function UserServicesPage() {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const router = useRouter();

  useEffect(() => {
    setIsLoggedIn(Boolean(getValidToken()));
  }, []);

  useEffect(() => {
    fetch(apiUrl("/services"))
      .then((res) => res.json())
      .then((data) => {
        setServices(data);
        setFilteredServices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let temp = [...services];

    if (search.trim()) {
      temp = temp.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (genderFilter !== "all") {
      temp = temp.filter((s) => s.gender === genderFilter);
    }

    if (categoryFilter !== "all") {
      temp = temp.filter((s) => s.category === categoryFilter);
    }
    setFilteredServices(temp); 
    setCurrentPage(1);
  }, [search, genderFilter, categoryFilter, services]);

const totalPages = Math.max(
  1,
  Math.ceil(filteredServices.length / itemsPerPage)
);

useEffect(() => {
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }
}, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const currentServices = filteredServices.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const getServiceImage = (service) =>
    service.image ? apiUrl(`${service.image}`) : DEFAULT_SERVICE_IMAGE;

  return (
    <div className={`min-h-screen bg-[#fffaf7] ${isLoggedIn ? "flex" : ""}`}>
      {isLoggedIn && <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />}
      <div className={`flex-1 flex-col min-h-screen ${isLoggedIn && isOpen ? "md:ml-70" : ""}`}>
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
        <main className="flex-1">
          <section className="border-b border-rose-100 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
              <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
                <div>
                  <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
                    <Sparkles size={16} />
                    Beauty and wellness services
                  </p>
                  <h1 className="text-4xl font-bold leading-tight text-gray-950 md:text-5xl">
                    Find the right service for your next appointment.
                  </h1>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
                    Search treatments, compare categories, and book salon or home beauty care from Singar Glow.
                  </p>
                </div>

                <div className="rounded-lg border border-rose-100 bg-[#fffaf7] p-6 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                    Browse mode
                  </p>
                  <div className="mt-4 grid grid-cols-2 rounded-lg border border-rose-200 bg-white p-1">
                    <button
                      className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Services
                    </button>
                    <button
                      onClick={() => router.push("/packages")}
                      className="rounded-md px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-rose-50 hover:text-rose-700"
                    >
                      Packages
                    </button>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    Showing {filteredServices.length} {filteredServices.length === 1 ? "service" : "services"}.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/bookings?custom=1")}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    <ListChecks size={17} />
                    Customize Services
                  </button>
                </div>
              </div>
            </div>
          </section>
 
          <section className="px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-600">
                  <Filter size={16} />
                  Refine services
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_180px_220px]">
                  <label className="relative block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-rose-200 bg-white py-3 pl-10 pr-3 text-gray-700 placeholder-gray-400 transition"
                    />
                  </label>

                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="rounded-lg border border-rose-200 bg-white p-3 text-gray-700 transition"
                  >
                    <option value="all">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-rose-200 bg-white p-3 text-gray-700 transition"
                  >
                    <option value="all">All Categories</option>
                    <option value="hair">Hair</option>
                    <option value="skin care">Skin Care</option>
                    <option value="nails">Nails</option>
                    <option value="makeup">Makeup</option>
                    <option value="massage">Massage</option>
                    <option value="body grooming">Body Grooming</option>
                    <option value="spa">Spa</option>
                  </select>
                </div>
              </div>

              <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                    Service catalog
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-gray-950">
                    Explore treatments designed for you
                  </h2>
                </div>
                <p className="text-sm font-medium text-gray-500">
                  Page {currentPage} of {totalPages}
                </p>
              </div>

              {loading ? (
                <div className="rounded-lg border border-rose-100 bg-white p-10 text-center text-gray-500 shadow-sm">
                  Loading services...
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="rounded-lg border border-rose-100 bg-white p-10 text-center shadow-sm">
                  <p className="font-semibold text-gray-900">No services match your criteria.</p>
                  <p className="mt-2 text-sm text-gray-500">Try a different search or category filter.</p>
                </div>
              ) : (
                <>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {currentServices.map((service) => (
                    <article
                      key={service.id}
                      className="group overflow-hidden rounded-lg border border-rose-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg"
                    >
                      <div className="relative aspect-[4/3] bg-rose-50">
                        <Image
                          src={getServiceImage(service)}
                          fill 
                          alt=""
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                  

                      <div className="p-5">

                        <div className="flex gap-2 mb-3 flex-wrap">
                          {service.gender && (
                            <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold capitalize text-rose-700">
                              {service.gender}
                            </span>
                          )}

                          {service.category && (
                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
                              {service.category}
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-lg text-gray-950">
                          {service.name}
                        </h3>

                        <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-5 text-gray-500">
                          {service.description}
                        </p>

                        <div className="my-5 flex justify-between gap-4 border-t border-rose-100 pt-4">
                          <span className="text-lg font-bold text-gray-950">
                            Rs. {service.price}
                          </span>
                          {service.duration && (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-500">
                              <Clock size={15} />
                              {service.duration}
                            </span>
                          )}
                        </div>

                        <Button
                          onClick={() => router.push(`/services/details/${service.id}`)}
                          className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
                        >
                          <CalendarCheck size={17} />
                          View and Book
                        </Button>

                      </div>
                    </article>
                  ))}
                </div>
                <div className="flex justify-center items-center gap-3 mt-10">

                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    > 
                      <ChevronLeft size={18} />
                    </button>

                    <span className="rounded-lg border border-rose-100 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-950 text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    > 
                      <ChevronRight size={18} />
                    </button>

                  </div>
                </>
                
              )}
            </div>
          </section>
        </main>

        <Footer />
      </div>
      </div>
    </div>
  );
} 
