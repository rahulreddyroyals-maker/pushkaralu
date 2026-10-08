"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { respondSchema } from "@/features/lostFound/schemas";

/** Reporter closes their own case (found / withdrawn). */
export function ResolveButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function resolve() {
    if (!confirm("Mark this report as resolved? It will no longer accept new messages.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lost-found/${reportId}/resolve`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      setError("Couldn't update the report. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Button variant="outline" onClick={resolve} disabled={busy}>
        Mark as resolved
      </Button>
      {error && <p role="alert" className="mt-1 text-xs text-status-critical">{error}</p>}
    </div>
  );
}

/** "I may have found this" — goes to the reporter only; the visitor never sees the reporter's contact. */
export function RespondForm({ reportId, signedIn }: { reportId: string; signedIn: boolean }) {
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <Card padding="md" className="text-center">
        <p className="text-sm text-ink-muted">Sign in to contact the person who posted this report.</p>
        <a className="mt-3 inline-block text-sm font-medium text-river-current hover:underline" href={`/login?redirect=/lost-and-found/${reportId}`}>
          Sign in
        </a>
      </Card>
    );
  }
  if (state === "sent") {
    return (
      <Card padding="md" className="text-center">
        <p className="text-sm font-medium text-status-low">Sent. The reporter will contact you on the number you gave.</p>
      </Card>
    );
  }

  async function send() {
    const parsed = respondSchema.safeParse({ message, contactPhone: phone });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0])] ??= issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    setState("sending");
    setServerError(null);
    try {
      const res = await fetch(`/api/lost-found/${reportId}/responses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "failed");
      setState("sent");
    } catch (e) {
      setServerError(e instanceof Error && e.message !== "failed" ? e.message : "Couldn't send. Please try again.");
      setState("error");
    }
  }

  return (
    <Card padding="md" className="flex flex-col gap-3">
      <h3 className="font-semibold text-ink">I may have information</h3>
      <p className="text-xs text-ink-muted">Your message and phone number go only to the person who posted this report.</p>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="resp-msg">Message</label>
        <textarea
          id="resp-msg"
          className="min-h-20 w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-ink focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {errors.message && <p className="mt-1 text-xs text-status-critical">{errors.message}</p>}
      </div>
      <Input label="Your phone number" value={phone} error={errors.contactPhone} onChange={(e) => setPhone(e.target.value)} />
      {serverError && <p role="alert" className="text-xs text-status-critical">{serverError}</p>}
      <Button onClick={send} disabled={state === "sending"}>
        {state === "sending" ? "Sending..." : "Send"}
      </Button>
    </Card>
  );
}
