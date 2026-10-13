"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { signOutUser } from "@/features/auth/client";

/** Self-service account deletion (required by Google Play). Two-step: reveal, then type DELETE. */
export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "DELETE" }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not delete the account."); return; }
      await signOutUser().catch(() => undefined);
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-status-critical/40 p-4">
      <h2 className="text-base font-semibold text-ink">Delete my account</h2>
      <p className="mt-1 text-sm text-ink-muted">Permanently removes your account, profile, notifications, family-group memberships and Lost &amp; Found reports. Booking and payment records are kept as required for accounting. This cannot be undone.</p>
      {!open ? (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>Delete my account</Button>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <label className="text-sm text-ink" htmlFor="del-confirm">Type DELETE to confirm</label>
          <input id="del-confirm" value={text} onChange={(e) => setText(e.target.value)} className="h-10 rounded-lg border border-border px-3 text-sm" autoComplete="off" />
          {error && <p className="text-sm text-status-critical" role="alert">{error}</p>}
          <div className="flex gap-2">
            <Button variant="danger" size="sm" disabled={busy || text !== "DELETE"} onClick={remove}>{busy ? "Deleting..." : "Permanently delete"}</Button>
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setText(""); }}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}
