'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import Image from "next/image";

export default function HomePage() {
  const [services, setServices] = useState([]);
  const [page, setPage] = useState(0);
  const itemsPerPage = 4; 

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("http://localhost:5001/services", { cache: "no-store" });
        if (!res.ok) return setServices([]);
        const data = await res.json();
        setServices(data.map(s => ({ ...s, image: `http://localhost:5001${s.image}` })));
      } catch {
        setServices([]);
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
      icon: "💄", 
      title: "Choose Service", 
      desc: "Browse and select your desired beauty service" 
    },
    { 
      icon: "📆", 
      title: "Pick Location & Time", 
      desc: "Choose between home service or salon visit and select your preferred time" 

    },
    { 
      icon: "✨", 
      title: "Relax & Enjoy", 
      desc: "Our experts take care of everything" 

    },
  ];

  const visibleServices = services.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div className="bg-[#fff7fa] text-gray-800">

      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur shadow-sm">

        <div className="max-w-7xl mx-auto px-6 py-1 flex justify-between items-center"> 
          <Link href="/" className="scale-75 origin-left">
            <Logo />
          </Link>

          <nav className="flex items-center gap-6 text-sm">
            <Link href="/login" className="hover:text-pink-500 font-bold">
              Login
            </Link>
            <Link href="/signup">
              <Button className="py-2 text-sm">Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="text-center py-20 px-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow-md">
          Discover Your Inner Glow
        </h1> 
        
        <p className="max-w-2xl mx-auto text-gray-600 mb-8">
          Professional beauty services at your doorstep or salons. 
          Choose from makeup, hair, massage, nails and more.
        </p>

        <Link href="/signup"> 
          <Button>Book Now</Button>
        </Link>
      </section>

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent inline-block mb-2">
            Our Featured Services
          </h2>
          <p className="text-gray-600 mb-10">
            Explore our wide range of beauty & wellness services
          </p>

          <div className="flex justify-center gap-6 overflow-x-auto py-4">
            {visibleServices.length > 0 ? 
            visibleServices.map((service, i) => (
              <div 
                key={service.id || i} 
                className="min-w-[250px] max-w-[250px] bg-white rounded-2xl shadow-xl hover:shadow-[0_6px_10px_-2px_rgba(236,72,153,0.5),0_4px_6px_-1px_rgba(236,72,153,0.08)] overflow-hidden transition"
              >
                <div className="aspect-square w-full relative">
                  <Image 
                  src={service.image} 
                  alt={service.name} 
                  fill 
                  className="object-cover" 
                  />
                </div>

                <div className="p-6 text-center">
                  <h3 className="font-semibold text-lg mb-2">
                    {service.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {service.description}
                  </p>
                  
                  <Link href="/signup">
                  <Button className="py-2 text-sm">Book Now</Button>
                  </Link>
                </div>
              </div>
            )) : 
            <p className="text-gray-500">No services available</p>
            }
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button 
              onClick={handleBack} 
              disabled={page === 0} 
              className="bg-gray-200 text-gray-800 hover:bg-gray-300 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              Back
            </button>
            <button 
              onClick={handleNext} 
              disabled={(page + 1) * itemsPerPage >= services.length} 
              className="bg-purple-500 text-white hover:bg-purple-700 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              See More
            </button>
          </div>
        </div>
      </section>

      <section className="bg-[#fff7fa] py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
            How It Works
          </h2>
          <p className="text-gray-600 mb-10">
            Book your beauty service in just 3 simple steps
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="font-semibold mb-2">
                  {i + 1}. {step.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-[#fff7fa] rounded-3xl shadow-xl p-10 text-center">

            <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Ready to Glow?
            </h2>

            <p className="text-gray-600 mb-6"> 
              Book your first service today and experience beauty like never before
              </p>
            
            <Link href="/signup">
              <Button>Get Started Now</Button>
              </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
} 