"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { allowedNextStatuses, type BookingActor } from "@/features/bookings/statusMachine";
import type { Booking, BookingStatus } from "@/features/bookings/types";

interface BookingListProps {
  bookings: Booking[];
  /** Which role the viewer holds relative to these bookings — drives which status actions are offered. The server re-checks this independently; this only controls what's shown. */
  actor: BookingActor;
  /** Admin views want the commission breakdown; customers shouldn't see the platform's cut on their own booking. */
  showFinancials?: boolean;
}

const STATUS_TONE: Record<BookingStatus, "info" | "success" | "warning" | "danger" | "neutral"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
  REFUNDED: "danger",
};

const PAYMENT_TONE = { UNPAID: "neutral", PENDING: "warning", PAID: "success", REFUNDED: "danger" } as const;

export function BookingList({ bookings, actor, showFinancials = false }: BookingListProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(bookingId: string, status: BookingStatus) {
    setBusyId(bookingId);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't update the booking");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the booking");
    } finally {
      setBusyId(null);
    }
  }

  if (bookings.length === 0) {
    return <EmptyState title="No bookings yet" description="Bookings will appear here once they're made." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-status-critical">{error}</p>}
      {bookings.map((b) => {
        const nextStatuses = allowedNextStatuses(b.status, actor);
        return (
          <Card key={b.id} padding="md" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                  <Badge tone={PAYMENT_TONE[b.paymentStatus]}>{b.paymentStatus}</Badge>
                  <span className="font-data text-xs text-ink-muted">{b.providerType}</span>
                </div>
                <p className="mt-2 font-data text-sm text-ink">
                  {new Date(b.serviceDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                  {b.serviceTime ? ` · ${b.serviceTime}` : ""} · qty {b.quantity}
                </p>
                {actor !== "customer" && (
                  <p className="mt-1 text-sm text-ink-muted">
                    {b.userDisplayName} · {b.userContactPhone}
                  </p>
                )}
                {b.notes && <p className="mt-1 text-sm text-ink-muted">{b.notes}</p>}
              </div>
              <div className="text-right">
                <p className="font-data text-lg font-medium text-river-deep">₹{b.amount}</p>
                {showFinancials && (
                  <p className="font-data text-xs text-ink-muted">
                    commission ₹{b.commissionAmount} ({b.commissionPercent}%) · payout ₹{b.providerPayout}
                  </p>
                )}
              </div>
            </div>

            {nextStatuses.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {nextStatuses.map((next) => (
                  <Button
                    key={next}
                    size="sm"
                    variant={next === "CANCELLED" || next === "REFUNDED" ? "outline" : "primary"}
                    onClick={() => changeStatus(b.id, next)}
                    disabled={busyId === b.id}
                  >
                    Mark {next.toLowerCase()}
                  </Button>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
