import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturedServices from "@/components/FeaturedServices";
import HowItWorks from "@/components/HowItWorks";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="bg-[#fff7fa] text-gray-800">
      <Navbar />
      <Hero />
      <FeaturedServices />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}
