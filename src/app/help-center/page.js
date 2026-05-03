import Link from "next/link";
import SupportPageLayout from "@/components/SupportPageLayout";
import {
  CalendarCheck,
  CreditCard,
  MessageCircle,
  Star,
  UserRound,
} from "lucide-react";

const helpItems = [
  {
    icon: CalendarCheck,
    title: "Booking support",
    text: "Get help choosing services, checking package details, and understanding how your appointment is confirmed.",
  },
  {
    icon: UserRound,
    title: "Account support",
    text: "Use login, signup, forgot password, and profile options to keep your account information up to date.",
  },
  {
    icon: CreditCard,
    title: "Payment questions",
    text: "Review payment status, failed payment handling, and what to do before trying again.",
  },
  {
    icon: Star,
    title: "Feedback support",
    text: "After your booking is completed, you can share your rating and review from your dashboard. Your feedback helps other customers choose services and helps Singar Glow improve service quality.",
  },
];

export default function HelpCenterPage() {
  return (
    <SupportPageLayout
      eyebrow="Support"
      title="Help Center"
      description="Find quick answers and the right next step when you need help with Singar Glow services, packages, bookings, or your account."
    >
      <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
            Support Topics
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-950">
            What do you need help with?
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-gray-600">
          Pick the topic closest to your issue, then jump into services, FAQs, or direct support.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {helpItems.map((item) => {
          const ItemIcon = item.icon;

          return (
            <article
              key={item.title}
              className="rounded-lg border border-rose-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg"
            >
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <ItemIcon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {item.text}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-10 overflow-hidden rounded-lg bg-gray-950 text-white shadow-lg">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-rose-200">
              <MessageCircle size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Need direct help?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
                Contact our support team for booking changes, service questions, payment issues, or account help.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Link
              href="/services"
              className="rounded-lg bg-white px-5 py-3 text-center text-sm font-semibold text-gray-950 transition hover:bg-rose-50"
            >
              Browse Services
            </Link>
            <Link
              href="/faqs"
              className="rounded-lg border border-white/20 px-5 py-3 text-center text-sm font-semibold text-white transition hover:border-rose-200 hover:text-rose-100"
            >
              Read FAQs
            </Link>
          </div>
        </div>
      </div>
    </SupportPageLayout>
  );
}
