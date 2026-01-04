import Link from "next/link";
import Button from "./Button";

export default function Hero() {
  return (
    <section className="text-center py-20 px-6">
      <h1 className="text-4xl md:text-5xl font-bold text-pink-500 mb-4">
        Discover Your Inner Glow
      </h1>

      <p className="max-w-2xl mx-auto text-gray-600 mb-8">
        Professional beauty services at your doorstep or salons.
        Choose from makeup, hair, massage, nails and more.
      </p>

      <Link href="/signup">
        <Button>
          Book Now
        </Button>
      </Link>
    </section>
  );
}
