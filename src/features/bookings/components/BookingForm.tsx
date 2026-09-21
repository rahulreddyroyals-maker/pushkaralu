"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button, Input, Card } from "@/components/ui";
import { createBookingInputSchema } from "@/features/bookings/schemas";
import { useAuth } from "@/features/auth/AuthProvider";
import type { LeadProviderType } from "@/features/leads/types";

interface BookingFormProps {
  providerId: string;
  providerType: LeadProviderType;
  /** Suggested price to prefill — providers list ranges, not fixed prices, so the customer can adjust before requesting. */
  suggestedAmount?: number;
}

/**
 * Creates a booking, then optionally opens Razorpay checkout for it.
 * Deliberately two steps rather than one: a booking exists (as PENDING,
 * UNPAID) even if the customer abandons payment, so the provider still
 * sees the request and can follow up — losing the lead entirely because
 * someone closed the payment popup would be worse.
 *
 * Only ever handles the PUBLIC Razorpay key id, which the server returns
 * alongside the order — no secret ever reaches this component.
 */
export function BookingForm({ providerId, providerType, suggestedAmount = 0 }: BookingFormProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [serviceDate, setServiceDate] = useState("");
  const [serviceTime, setServiceTime] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState(suggestedAmount);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "created" | "paying">("idle");
  const [bookingId, setBookingId] = useState<string | null>(null);

  if (loading) return null;

  if (!user) {
    return (
      <Card padding="md" className="text-center">
        <p className="text-sm text-ink-muted">Sign in to request a booking.</p>
        <Button size="sm" className="mt-3" onClick={() => router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}>
          Sign in
        </Button>
      </Card>
    );
  }

  async function handleCreate() {
    setError(null);
    const parsed = createBookingInputSchema.safeParse({
      providerId,
      providerType,
      userContactPhone: phone,
      serviceDate,
      serviceTime,
      quantity,
      amount,
      notes,
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStatus("creating");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Request failed");
      setBookingId(data.id);
      setStatus("created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your booking. Please try again.");
      setStatus("idle");
    }
  }

  async function handlePay() {
    if (!bookingId) return;
    setError(null);
    setStatus("paying");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payment-order`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't start payment");

      // Razorpay's checkout script attaches this global once loaded.
      const RazorpayCheckout = (window as unknown as { Razorpay?: new (options: unknown) => { open: () => void } }).Razorpay;
      if (!RazorpayCheckout) {
        throw new Error("Payment library didn't load. Please refresh and try again.");
      }

      const checkout = new RazorpayCheckout({
        key: data.razorpayKeyId,
        order_id: data.orderId,
        amount: data.amountInPaise,
        currency: data.currency,
        name: "Pushkaralu",
        description: "Booking payment",
        prefill: { contact: phone, name: user?.displayName ?? "" },
        handler: () => {
          // Payment confirmation is NOT trusted from this callback — the
          // webhook is the source of truth (a client callback can be
          // faked). This just moves the user along; the booking flips to
          // PAID when Razorpay's signed webhook arrives.
          router.push("/bookings");
          router.refresh();
        },
      });
      checkout.open();
      setStatus("created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start payment.");
      setStatus("created");
    }
  }

  if (status === "created" && bookingId) {
    return (
      <>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
        <Card padding="md" className="flex flex-col gap-3">
          <p className="text-sm font-medium text-status-low">Booking request sent.</p>
          <p className="text-sm text-ink-muted">
            The provider will confirm it. You can pay now to secure it, or pay later from your bookings.
          </p>
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex gap-2">
            {amount > 0 && (
              <Button size="sm" onClick={handlePay} disabled={status !== "created"}>
                Pay ₹{amount}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => router.push("/bookings")}>
              View my bookings
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <Card padding="md" className="flex flex-col gap-3">
      <h3 className="font-semibold text-ink">Request a booking</h3>
      {error && <p className="text-xs text-status-critical">{error}</p>}

      <Input label="Date" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} error={fieldErrors.serviceDate} />
      <Input
        label="Preferred time (optional)"
        value={serviceTime}
        onChange={(e) => setServiceTime(e.target.value)}
        placeholder="e.g. 10:00 AM"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          error={fieldErrors.quantity}
        />
        <Input
          label="Amount (₹)"
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          error={fieldErrors.amount}
          hint="Agreed price"
        />
      </div>
      <Input
        label="Your phone number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={fieldErrors.userContactPhone}
        placeholder="For the provider to reach you"
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20"
          placeholder="Anything the provider should know"
        />
      </div>

      <Button onClick={handleCreate} disabled={status === "creating"}>
        {status === "creating" ? "Sending..." : "Request booking"}
      </Button>
    </Card>
  );
}
