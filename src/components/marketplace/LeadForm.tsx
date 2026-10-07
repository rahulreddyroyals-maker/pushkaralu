"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { leadInputSchema } from "@/features/leads/schemas";
import { useAuth } from "@/features/auth/AuthProvider";
import type { AnyLeadType } from "@/features/leads/types";

interface LeadFormProps {
  providerId: string;
  providerType: AnyLeadType;
  /** Who follows up — "the provider" for owner-managed listings, "our team" for admin-managed catalog records. */
  recipientLabel?: string;
}

/**
 * The ONLY way a public visitor reaches a provider — public pages never
 * render the provider's raw contact info (spec: "do not expose private
 * provider information unnecessarily"). Requires sign-in, both to
 * prevent anonymous spam and because the provider needs a real contact
 * to call back.
 */
export function LeadForm({ providerId, providerType, recipientLabel = "the provider" }: LeadFormProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  if (loading) return null;

  if (!user) {
    return (
      <Card padding="md" className="text-center">
        <p className="text-sm text-ink-muted">Sign in to send an inquiry.</p>
        <Button size="sm" className="mt-3" onClick={() => router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}>
          Sign in
        </Button>
      </Card>
    );
  }

  if (status === "sent") {
    return (
      <Card padding="md" className="text-center">
        <p className="text-sm font-medium text-status-low">Inquiry sent — {recipientLabel} will contact you directly.</p>
      </Card>
    );
  }

  async function handleSubmit() {
    const parsed = leadInputSchema.safeParse({ providerId, providerType, userContactPhone: phone, message });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStatus("submitting");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card padding="md" className="flex flex-col gap-3">
      <h3 className="font-semibold text-ink">Send an inquiry</h3>
      <Input
        label="Your phone number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={fieldErrors.userContactPhone}
        placeholder="For a call back"
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20"
          placeholder="What are you looking for?"
        />
        {fieldErrors.message && <p className="mt-1 text-xs text-status-critical">{fieldErrors.message}</p>}
      </div>
      {status === "error" && <p className="text-xs text-status-critical">Couldn&apos;t send your inquiry. Please try again.</p>}
      <Button onClick={handleSubmit} disabled={status === "submitting"}>
        {status === "submitting" ? "Sending..." : "Send inquiry"}
      </Button>
    </Card>
  );
}
