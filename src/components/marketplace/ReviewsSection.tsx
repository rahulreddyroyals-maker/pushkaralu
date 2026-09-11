"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge } from "@/components/ui";
import { reviewInputSchema } from "@/features/reviews/schemas";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Review, ReviewAggregate } from "@/features/reviews/types";
import type { LeadProviderType } from "@/features/leads/types";

interface ReviewsSectionProps {
  providerId: string;
  providerType: LeadProviderType;
  initialReviews: Review[];
  aggregate: ReviewAggregate;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="font-data text-sm text-saffron" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(Math.round(rating))}
      <span className="text-border">{"★".repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

export function ReviewsSection({ providerId, providerType, initialReviews, aggregate }: ReviewsSectionProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = reviewInputSchema.safeParse({ providerId, providerType, rating, text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid review");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error("Request failed");
      setText("");
      setShowForm(false);
      router.refresh();
      setReviews((prev) => [
        { id: `temp-${Date.now()}`, providerId, providerType, userId: user?.uid ?? "", userDisplayName: user?.displayName ?? "You", rating, text: parsed.data.text, createdAt: new Date().toISOString() },
        ...prev,
      ]);
    } catch {
      setError("Couldn't post your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-ink">Reviews</h2>
          {aggregate.count > 0 && (
            <>
              <Stars rating={aggregate.average} />
              <span className="text-sm text-ink-muted">
                {aggregate.average} ({aggregate.count} review{aggregate.count === 1 ? "" : "s"})
              </span>
            </>
          )}
        </div>
        {!loading && user && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            Write a review
          </Button>
        )}
      </div>

      {showForm && (
        <Card padding="md" className="flex flex-col gap-3">
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <span className={n <= rating ? "text-saffron" : "text-border"}>★</span>
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20"
            placeholder="Share your experience..."
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Posting..." : "Post review"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {reviews.length === 0 && <p className="text-sm text-ink-muted">No reviews yet.</p>}

      <div className="flex flex-col gap-3">
        {reviews.map((r) => (
          <Card key={r.id} padding="md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{r.userDisplayName}</span>
              <Stars rating={r.rating} />
            </div>
            <p className="mt-1 text-sm text-ink-muted">{r.text}</p>
          </Card>
        ))}
      </div>

      {!loading && !user && (
        <Badge tone="neutral" className="w-fit">
          Sign in to write a review
        </Badge>
      )}
    </div>
  );
}
