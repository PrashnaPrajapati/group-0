import Link from "next/link";
import Button from "./Button";

export default function CTA() {
  return (
    <section className="text-center py-16 bg-white">
      <h2 className="text-2xl font-bold text-pink-500 mb-4">
        Ready to Glow?
      </h2>
      <p className="text-gray-600 mb-6">
        Book your first service today and experience beauty like never before
      </p>

      <Link href="/signup">
        <Button>
          Get Started Now
        </Button>
      </Link>
    </section>
  );
}
