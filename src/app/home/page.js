import Link from "next/link";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

export default function HomePage() {
  const services = [
    {
      title: "Makeup",
      desc: "Professional makeup for every occasion",
      image: "/bridal.png",
    },
    {
      title: "Hair Styling",
      desc: "Trendy hair styling by experts",
      image: "/hair.webp",
    },
    {
      title: "Spa Treatment",
      desc: "Relaxing spa & wellness services",
      image: "/spa.png",
    },
  ];

  const steps = [
    {
      title: "Choose Service",
      desc: "Browse and select your desired beauty service",
    },
    {
      title: "Pick Location & Time",
      desc: "Choose salon or home service easily",
    },
    {
      title: "Relax & Enjoy",
      desc: "Our experts take care of everything",
    },
  ];

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
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-center text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
          Our Featured Services
        </h2>
        <p className="text-center text-gray-600 mb-10">
          Explore our wide range of beauty & wellness services
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-md hover:shadow-lg transition overflow-hidden"
            >
              <div className="aspect-square w-full overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-6 text-center">
                <h3 className="font-semibold text-lg mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {service.desc}
                </p>

                <Button className="py-2 text-sm">Book Now</Button>
              </div>
            </div>
          ))}
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
              <div key={i} className="bg-white rounded-xl shadow-md p-6">
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

      <section className="text-center py-16 bg-white">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          Ready to Glow?
        </h2>
        <p className="text-gray-600 mb-6">
          Book your first service today and experience beauty like never before
        </p>

        <Link href="/signup">
          <Button>Get Started Now</Button>
        </Link>
      </section>

      <Footer />

    </div>
  );
}
