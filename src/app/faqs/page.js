import SupportPageLayout from "@/components/SupportPageLayout";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Can I view services without logging in?",
    answer:
      "Yes. You can browse services and packages first. Login is needed when you want to book, manage your profile, chat, or make payments.",
  },
  {
    question: "What is the difference between services and packages?",
    answer:
      "Services are individual beauty treatments. Packages combine multiple services together for a more complete experience.",
  },
  {
    question: "Can I book a home service?",
    answer:
      "Yes, where available. Choose your preferred service, then follow the booking flow to provide location and time details.",
  },
  {
    question: "What should I do if payment fails?",
    answer:
      "Check the payment status, make sure your details are correct, and try again. If it still fails, contact support before creating another booking.",
  },
  {
    question: "Can I change my appointment?",
    answer:
      "Appointment changes depend on provider availability. Please request changes as early as possible.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Use the Help Center for guidance, or contact Singar Glow through the phone and email details shown in the footer.",
  },
];

export default function FaqsPage() {
  return (
    <SupportPageLayout
      eyebrow="Answers"
      title="FAQs"
      description="Quick answers to common questions about browsing, booking, payments, services, packages, and account access."
    >
      <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
            Common Questions
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-950">
            Answers before you book
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-gray-600">
          Quick guidance for browsing services, booking appointments, managing payments, and getting support.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {faqs.map((faq) => (
          <article
            key={faq.question}
            className="rounded-lg border border-rose-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg"
          >
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <HelpCircle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-950">
                  {faq.question}
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {faq.answer}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SupportPageLayout>
  );
}
