"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Select, Button, Input } from "@/components/ui";
import { CrowdStatusBadge } from "@/components/ui/CrowdStatusBadge";
import { crowdStatusUpdateSchema } from "@/features/ghats/schemas";
import type { CrowdStatus } from "@/types/domain";
import type { OperationalStatus } from "@/features/ghats/types";

interface CrowdStatusControlProps {
  eventId: string;
  ghatId: string;
  currentStatus: CrowdStatus;
  updatedAt: string;
  reportedBy: string | null;
  waitMinutes: number | null | undefined;
  operationalStatus: OperationalStatus;
  alternativeGhatId: string | null | undefined;
  statusNote: string | undefined;
  /** Other published ghats of this event the staff member may suggest. */
  alternatives: { id: string; name: string }[];
}

/**
 * One manual report: MODERATOR+ (enforced server-side; this is only the UI).
 * It is deliberately framed as "post an update" — everything entered here is
 * shown to the public as staff-entered, with this moment as its timestamp.
 */
export function CrowdStatusControl(props: CrowdStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<CrowdStatus>(props.currentStatus);
  const [wait, setWait] = useState(props.waitMinutes === null || props.waitMinutes === undefined ? "" : String(props.waitMinutes));
  const [open, setOpen] = useState<OperationalStatus>(props.operationalStatus);
  const [alt, setAlt] = useState(props.alternativeGhatId ?? "");
  const [note, setNote] = useState(props.statusNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleUpdate() {
    setError(null);
    setSaved(false);
    const payload = {
      crowdStatus: status,
      waitMinutes: wait.trim() === "" ? null : Number(wait),
      ...(open !== "UNKNOWN" ? { operationalStatus: open } : {}),
      alternativeGhatId: alt || null,
      statusNote: note,
    };
    const parsed = crowdStatusUpdateSchema.safeParse(payload);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the form");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${props.eventId}/ghats/${props.ghatId}/crowd-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update crowd status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="md" className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-ink">What visitors see now</p>
          <CrowdStatusBadge detailed status={props.currentStatus} updatedAt={props.updatedAt} reportedBy={props.reportedBy} waitMinutes={props.waitMinutes} operationalStatus={props.operationalStatus} note={props.statusNote} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Crowd level"
          value={status}
          onChange={(e) => setStatus(e.target.value as CrowdStatus)}
          options={[
            { value: "LOW", label: "Low" },
            { value: "MODERATE", label: "Moderate" },
            { value: "HIGH", label: "High" },
            { value: "CRITICAL", label: "Critical" },
          ]}
        />
        <Input label="Waiting time (minutes)" type="number" min={0} max={720} value={wait} onChange={(e) => setWait(e.target.value)} hint="Leave empty if you don't know — it won't be shown as 0." />
        <Select
          label="Ghat is"
          value={open}
          onChange={(e) => setOpen(e.target.value as OperationalStatus)}
          options={[
            { value: "UNKNOWN", label: "Not reported" },
            { value: "OPEN", label: "Open" },
            { value: "CLOSED", label: "Closed" },
          ]}
        />
        <Select label="Suggest alternative ghat" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="None" options={props.alternatives.map((a) => ({ value: a.id, label: a.name }))} />
      </div>
      <Input label="Note for visitors (optional)" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />

      <p className="text-xs text-ink-muted">Visitors will see this as entered by staff, with the time you save it. High or Critical crowd, or closing the ghat, also alerts people following this ghat.</p>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleUpdate} disabled={saving}>
          {saving ? "Posting..." : "Post update"}
        </Button>
        {saved && <span className="text-xs text-status-success">Posted.</span>}
      </div>
      {error && <p role="alert" className="text-xs text-status-critical">{error}</p>}
    </Card>
  );
}
