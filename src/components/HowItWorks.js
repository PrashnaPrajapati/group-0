export default function HowItWorks() {
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
    <section className="bg-[#ffe6ef] py-16">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-2xl font-bold text-pink-500 mb-2">
          How It Works
        </h2>
        <p className="text-gray-600 mb-10">
          Book your beauty service in just 3 simple steps
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md p-6"
            >
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
  );
}
