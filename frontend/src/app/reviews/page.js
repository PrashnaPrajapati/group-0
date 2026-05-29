"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MessageSquareQuote, Star } from "lucide-react";
import SupportPageLayout from "@/components/SupportPageLayout";
import { apiUrl } from "@/lib/apiConfig";

function ReviewStars({ rating = 0 }) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <div className="flex items-center gap-1 text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index < value ? "fill-current" : ""}`}
        /> 
      ))}
      <span className="ml-2 text-sm font-semibold text-gray-500">
        {value}/5
      </span>
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch(apiUrl("/reviews"), { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load reviews");

        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      } catch {
        setError("Reviews could not be loaded right now.");
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, []);

  return (
    <SupportPageLayout
      eyebrow="Customer Stories"
      title="Reviews"
      description="See what customers say about their Singar Glow experience, from everyday beauty care to special event services."
    >
      <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-rose-600">
            Customer Feedback
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-950">
            Real experiences from bookings
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-gray-600">
          Reviews help new customers choose with confidence and help Singar Glow improve every appointment.
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-rose-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-lg bg-rose-100" />
          <p className="font-medium text-gray-500">Loading customer reviews...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-100 bg-white p-10 text-center shadow-sm">
          <MessageSquareQuote className="mx-auto mb-4 text-rose-500" size={32} />
          <p className="font-medium text-gray-500">{error}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-lg border border-rose-100 bg-white p-10 text-center shadow-sm">
          <MessageSquareQuote className="mx-auto mb-4 text-rose-500" size={32} />
          <p className="font-medium text-gray-500">
            No customer reviews have been submitted yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {reviews.map((review) => (
            <article
              key={`${review.bookingId}-${review.created_at}`}
              className="rounded-lg border border-rose-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <MessageSquareQuote size={22} />
              </div>
              <ReviewStars rating={review.rating} />

              <p className="mt-4 text-sm leading-6 text-gray-600">
                {review.review}
              </p>

              <div className="mt-5 border-t border-rose-100 pt-4">
                <h3 className="font-semibold text-gray-950">
                  {review.customer || "Customer"}
                </h3>
                <p className="text-sm font-medium text-rose-600">
                  {review.itemType}: {review.itemName}
                </p>
                {review.created_at && (
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-10 overflow-hidden rounded-lg bg-gray-950 text-white shadow-lg">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-rose-300">
              Ready for your own glow moment?
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Explore services designed for beauty, comfort, and confidence.
            </h2>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-rose-50"
          >
            Explore Services
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </SupportPageLayout>
  );
}
