"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { monetizationSettingsInputSchema } from "@/features/settings/schemas";
import type { MonetizationSettings } from "@/features/settings/types";

interface MonetizationSettingsFormProps {
  initial: MonetizationSettings;
  /** When false the form renders read-only — the server enforces SUPER_ADMIN independently, this just avoids showing an editable form that would 403 on save. */
  canEdit: boolean;
}

export function MonetizationSettingsForm({ initial, canEdit }: MonetizationSettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    bookingCommissionPercent: initial.bookingCommissionPercent,
    leadFee: initial.leadFee,
    featuredListingPrice: initial.featuredListingPrice,
    sponsoredListingPrice: initial.sponsoredListingPrice,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const parsed = monetizationSettingsInputSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStatus("saving");
    try {
      const res = await fetch("/api/admin/settings/monetization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("saved");
      router.refresh();
    } catch {
      setError("Couldn't save settings. Please try again.");
      setStatus("error");
    }
  }

  return (
    <Card padding="lg" className="flex max-w-xl flex-col gap-5">
      {!canEdit && (
        <p className="rounded-md bg-river-mist px-3 py-2 text-sm text-river-deep">
          Only a SUPER_ADMIN can change these values. Showing current settings read-only.
        </p>
      )}
      {error && <p className="text-sm text-status-critical">{error}</p>}

      <Input
        label="Booking commission (%)"
        type="number"
        step="0.1"
        min={0}
        max={100}
        value={form.bookingCommissionPercent}
        onChange={(e) => setForm({ ...form, bookingCommissionPercent: Number(e.target.value) })}
        error={fieldErrors.bookingCommissionPercent}
        hint="Applied to new bookings only — existing bookings keep the rate agreed when they were made."
        disabled={!canEdit}
      />
      <Input
        label="Lead fee (₹)"
        type="number"
        min={0}
        value={form.leadFee}
        onChange={(e) => setForm({ ...form, leadFee: Number(e.target.value) })}
        error={fieldErrors.leadFee}
        hint="0 means inquiries are free for providers."
        disabled={!canEdit}
      />
      <Input
        label="Featured listing price (₹)"
        type="number"
        min={0}
        value={form.featuredListingPrice}
        onChange={(e) => setForm({ ...form, featuredListingPrice: Number(e.target.value) })}
        error={fieldErrors.featuredListingPrice}
        disabled={!canEdit}
      />
      <Input
        label="Sponsored listing price (₹)"
        type="number"
        min={0}
        value={form.sponsoredListingPrice}
        onChange={(e) => setForm({ ...form, sponsoredListingPrice: Number(e.target.value) })}
        error={fieldErrors.sponsoredListingPrice}
        disabled={!canEdit}
      />

      {canEdit && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSubmit} disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Save settings"}
          </Button>
          {status === "saved" && <span className="text-sm text-status-low">Saved</span>}
        </div>
      )}
    </Card>
  );
}
