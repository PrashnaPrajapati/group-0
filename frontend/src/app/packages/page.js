"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import { getValidToken } from "@/lib/authStorage";
import {
  ChevronLeft,
  ChevronRight,
  Gift,
  PackageCheck,
  Search,
  Sparkles,
} from "lucide-react";

const DEFAULT_PACKAGE_IMAGE = "/bridal.png";

export default function BookPackagePage() {
  const router = useRouter();

  const [tab, setTab] = useState("packages"); 
  const [packages, setPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    setIsLoggedIn(Boolean(getValidToken()));
  }, []);
 
  useEffect(() => {
    if (tab === "packages") {
      fetch(apiUrl("/packages"))
        .then((res) => res.json())
        .then((data) => {
          setPackages(data);
          setFilteredPackages(data);
        })
        .catch((err) => console.error(err));
    }
  }, [tab]);
 
  useEffect(() => {
    if (tab === "services") {
      router.push("/services");
    }
  }, [tab, router]);
 
  useEffect(() => {
    if (!search.trim()) {
      setFilteredPackages(packages);
    } else {
      const filtered = packages.filter((pkg) =>
        pkg.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredPackages(filtered);
    }
    setCurrentPage(1);
  }, [search, packages]);

  const totalPages = Math.max(
  1,
  Math.ceil(filteredPackages.length / itemsPerPage)
);

const startIndex = (currentPage - 1) * itemsPerPage;

const currentPackages = filteredPackages.slice(
  startIndex,
  startIndex + itemsPerPage
);

useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getPackageImage = (pkg) =>
    pkg.image
      ? apiUrl(pkg.image.startsWith("http") ? pkg.image : `/uploads/packages/${pkg.image}`)
      : DEFAULT_PACKAGE_IMAGE;

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
        <main className="flex-1">
          <section className="border-b border-rose-100 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
              <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
                <div>
                  <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
                    <Gift size={16} />
                    Curated beauty bundles
                  </p>
                  <h1 className="text-4xl font-bold leading-tight text-gray-950 md:text-5xl">
                    Book complete packages for bigger beauty moments.
                  </h1>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
                    Choose bundled services for bridal prep, relaxation, grooming, or full pampering days.
                  </p>
                </div>

                <div className="rounded-lg border border-rose-100 bg-[#fffaf7] p-6 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                    Browse mode
                  </p>
                  <div className="mt-4 grid grid-cols-2 rounded-lg border border-rose-200 bg-white p-1">
                    <button
                      onClick={() => setTab("services")}
                      className="rounded-md px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-rose-50 hover:text-rose-700"
                    >
                      Services
                    </button>
                    <button
                      onClick={() => setTab("packages")}
                      className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Packages
                    </button>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    Showing {filteredPackages.length} {filteredPackages.length === 1 ? "package" : "packages"}.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-7xl">
              {tab === "packages" && (
                <div className="mb-8 rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-600">
                    <Search size={16} />
                    Search packages
                  </div>
                  <label className="relative block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search packages..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-rose-200 bg-white py-3 pl-10 pr-3 text-gray-700 placeholder-gray-400 transition"
                    />
                  </label>
                </div>
              )}

              <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
                    Package catalog
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-gray-950">
                    Convenience, value, and relaxation
                  </h2>
                </div>
                <p className="text-sm font-medium text-gray-500">
                  Page {currentPage} of {totalPages}
                </p>
              </div>

              {tab === "packages" && (
                <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {currentPackages.length === 0 ? (
                    <div className="col-span-full rounded-lg border border-rose-100 bg-white p-10 text-center shadow-sm">
                      <p className="font-semibold text-gray-900">No packages match your search.</p>
                      <p className="mt-2 text-sm text-gray-500">Try another package name.</p>
                    </div>
                  ) : (
                    currentPackages.map((pkg) => (
                      <article
                          key={pkg.id}
                          className="group overflow-hidden rounded-lg border border-rose-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg"
                        >
                        <div className="relative aspect-[4/3] bg-rose-50">
                          <Image
                            src={getPackageImage(pkg)} 
                            fill
                            alt=""
                            className="object-cover transition duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-5">
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                            <PackageCheck size={14} />
                            Includes {pkg.services.length} service{pkg.services.length > 1 ? "s" : ""}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-950">{pkg.name}</h3>
                          <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-5 text-gray-500">{pkg.description}</p>
                          <div className="my-5 border-t border-rose-100 pt-4">
                            <div className="text-lg font-bold text-gray-950">
                              Total: Rs. {pkg.price}
                            </div>
                          </div>
                          <Button
                            onClick={() => router.push(`/packages/details/${pkg.id}`)}
                            className="w-full py-3"
                          >
                            View Details
                          </Button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <div className="flex justify-center items-center gap-3 mt-10">
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.max(p - 1, 1))
                      }
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
