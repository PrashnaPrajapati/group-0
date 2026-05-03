import SupportPageLayout from "@/components/SupportPageLayout";
import {
  CalendarCheck,
  Clock,
  CreditCard,
  Home,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const policies = [
  {
    icon: CalendarCheck,
    title: "Booking confirmation",
    text: "Your booking is confirmed after you select a service or package, complete the required details, and receive confirmation in the app.",
  },
  {
    icon: RefreshCw,
    title: "Rescheduling",
    text: "Please reschedule as early as possible so the service provider can adjust availability and prepare for the new time.",
  },
  {
    icon: ReceiptText,
    title: "Cancellations",
    text: "If you cancel a confirmed booking, 15% of the total booking amount will be deducted as a cancellation charge. Any refund will be calculated after this deduction.",
  },
  {
    icon: Home,
    title: "Home service charge",
    text: "If you choose home service, an extra 10% charge will be added to the total amount. Salon visit bookings do not include this extra charge.",
  },
  {
    icon: Clock,
    title: "Arrival and readiness",
    text: "For salon visits, arrive on time. For home service, keep the service space ready before the provider arrives.",
  },
  {
    icon: CreditCard,
    title: "Payments",
    text: "Payment status should be checked before the appointment. If payment fails, retry from the payment page or contact support.",
  },
  {
    icon: ShieldCheck,
    title: "Service changes",
    text: "Price, duration, and availability can change based on selected service, package, provider, and appointment requirements.",
  },
];

export default function BookingPolicyPage() {
  return (
    <SupportPageLayout
      eyebrow="Guidelines"
      title="Booking Policy"
      description="Clear booking rules help every appointment run smoothly for customers, providers, and the Singar Glow team."
    >
      <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
            Appointment Rules
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-950">
            Simple terms for smooth bookings
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-gray-600">
          Review these details before confirming your appointment so timing, payment, and service expectations are clear.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {policies.map((policy, index) => {
          const PolicyIcon = policy.icon;

          return (
            <article
              key={policy.title}
              className="rounded-lg border border-rose-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg"
            >
              <div className="flex gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <PolicyIcon size={23} />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-950 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-950">
                    {policy.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {policy.text}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </SupportPageLayout>
  );
}
