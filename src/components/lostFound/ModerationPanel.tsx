"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input } from "@/components/ui";
import { moderateSchema } from "@/features/lostFound/schemas";
import { LOST_FOUND_CATEGORY_LABELS, type LostFoundReport } from "@/features/lostFound/types";
import { formatRelativeTime } from "@/lib/catalog/format";

const textarea =
  "min-h-20 w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-ink focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20";

/**
 * Moderator view of one report: the full private details on top, and the
 * public text the moderator must WRITE (fields start empty on purpose — a
 * one-click approve would publish the reporter's raw words).
 */
export function ModerationPanel({ report }: { report: LostFoundReport }) {
  const router = useRouter();
  const [publicTitle, setPublicTitle] = useState("");
  const [publicSummary, setPublicSummary] = useState("");
  const [publicArea, setPublicArea] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: unknown) {
    const parsed = moderateSchema.safeParse(body);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0])] ??= issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lost-found/${report.id}/moderate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message !== "failed" ? e.message : "Action failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="md" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {report.priority && <Badge tone="danger">Urgent — person</Badge>}
        <Badge tone={report.reportType === "LOST" ? "danger" : "success"}>{report.reportType}</Badge>
        <Badge tone="neutral">{LOST_FOUND_CATEGORY_LABELS[report.category]}</Badge>
        <Badge tone="info">{report.status}</Badge>
        <span className="text-xs text-ink-muted">submitted {formatRelativeTime(report.createdAt)}</span>
      </div>

      <div className="rounded-lg bg-surface p-3 text-sm">
        <p className="font-semibold text-ink">{report.title}</p>
        <p className="mt-1 whitespace-pre-wrap text-ink-muted">{report.description}</p>
        <p className="mt-2 text-xs text-ink-muted">
          Last seen: {report.lastSeenPlace} · {new Date(report.lastSeenAt).toLocaleString("en-IN")}
        </p>
        <p className="mt-1 font-data text-xs text-ink-muted">
          Reporter: {report.reporterName} · {report.contactPhone}
          {report.subjectName ? ` · Subject: ${report.subjectName}${report.subjectAge !== undefined ? ` (${report.subjectAge})` : ""}` : ""}
        </p>
        <p className="mt-1 text-xs text-status-critical">Private — do not copy phone numbers, names of minors, or ID numbers into the public text.</p>
      </div>

      {error && <p role="alert" className="text-sm text-status-critical">{error}</p>}

      {report.status === "PENDING" && (
        <>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-ink">Public listing (written by you)</h3>
            <Input label="Public title" value={publicTitle} error={errors.publicTitle} onChange={(e) => setPublicTitle(e.target.value)} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor={`sum-${report.id}`}>Public summary</label>
              <textarea id={`sum-${report.id}`} className={textarea} value={publicSummary} onChange={(e) => setPublicSummary(e.target.value)} />
              {errors.publicSummary && <p className="mt-1 text-xs text-status-critical">{errors.publicSummary}</p>}
            </div>
            <Input label="Public area" value={publicArea} error={errors.publicArea} onChange={(e) => setPublicArea(e.target.value)} />
            <div>
              <Button disabled={busy} onClick={() => send({ decision: "APPROVE", publicTitle, publicSummary, publicArea })}>
                Approve &amp; publish
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Input label="Rejection reason (shown to the reporter)" value={reason} error={errors.reason} onChange={(e) => setReason(e.target.value)} />
            <div>
              <Button variant="danger" disabled={busy} onClick={() => send({ decision: "REJECT", reason })}>
                Reject
              </Button>
            </div>
          </div>
        </>
      )}

      {report.status === "APPROVED" && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm text-ink-muted">Published as: “{report.publicTitle}”</p>
          <Input label="Reason for taking down" value={reason} error={errors.reason} onChange={(e) => setReason(e.target.value)} />
          <div>
            <Button variant="danger" disabled={busy} onClick={() => send({ decision: "TAKEDOWN", reason })}>
              Take down
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
