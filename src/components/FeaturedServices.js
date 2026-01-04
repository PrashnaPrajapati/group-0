import Button from "./Button";

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

export default function FeaturedServices() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <h2 className="text-center text-2xl font-bold text-pink-500 mb-2">
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
            {/* IMAGE FIX */}
            <div className="aspect-[10/10] w-full overflow-hidden">
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

              <Button className="py-2 text-sm">
                Book Now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
