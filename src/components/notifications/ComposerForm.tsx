"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select } from "@/components/ui";
import { api } from "@/lib/clientApi";
import { composeSchema } from "@/features/notifications/schemas";
import { canSend } from "@/features/notifications/policy";
import { CATEGORY_LABELS, type NotificationCategory } from "@/features/notifications/types";
import { ROLES, type Role } from "@/types/roles";

type ComposeCategory = Exclude<NotificationCategory, "BOOKING">;
const CATEGORIES: ComposeCategory[] = ["EMERGENCY", "CROWD", "EVENT_REMINDER", "MARKETING"];

export interface EventOption {
  id: string;
  name: string;
  ghats: { id: string; name: string }[];
}

export function ComposerForm({ role, events }: { role: Role | null; events: EventOption[] }) {
  const router = useRouter();
  const allowed = CATEGORIES.filter((c) => canSend(role, c));
  const [category, setCategory] = useState<ComposeCategory>(allowed[0] ?? "CROWD");
  const [priority, setPriority] = useState("NORMAL");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"ALL" | "ROLES" | "FOLLOWERS" | "USER">("FOLLOWERS");
  const [roles, setRoles] = useState<Role[]>([]);
  const [uid, setUid] = useState("");
  const [eventId, setEventId] = useState("");
  const [ghatId, setGhatId] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [sendPush, setSendPush] = useState(true);
  const [confirmEmergency, setConfirmEmergency] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ghats = events.find((e) => e.id === eventId)?.ghats ?? [];
  const priorities = category === "EMERGENCY" ? ["HIGH", "URGENT"] : category === "MARKETING" ? ["LOW", "NORMAL"] : ["LOW", "NORMAL", "HIGH", "URGENT"];

  if (allowed.length === 0) return <p className="text-sm text-ink-muted">Your role can&apos;t send notifications.</p>;

  function changeCategory(c: ComposeCategory) {
    setCategory(c);
    setPriority(c === "EMERGENCY" ? "URGENT" : "NORMAL");
  }

  async function submit() {
    setError(null);
    const payload = {
      category,
      priority,
      title,
      message,
      audience: audience === "ROLES" ? { type: "ROLES", roles } : audience === "USER" ? { type: "USER", uid } : { type: audience },
      ...(eventId ? { eventId } : {}),
      ...(ghatId ? { ghatId } : {}),
      ...(scheduleAt ? { scheduleAt: new Date(scheduleAt).toISOString() } : {}),
      sendPush,
      ...(category === "EMERGENCY" ? { confirmEmergency } : {}),
    };
    const parsed = composeSchema.safeParse(payload);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the form");
    if (category === "EMERGENCY" && !confirm("Send this emergency alert now? It can't be recalled once delivered.")) return;
    setBusy(true);
    const res = await api<{ id: string }>("/api/admin/notifications", "POST", parsed.data);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/admin/notifications/${res.data.id}`);
  }

  return (
    <Card padding="md" className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Type" value={category} onChange={(e) => changeCategory(e.target.value as ComposeCategory)} options={allowed.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))} />
        <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} options={priorities.map((p) => ({ value: p, label: p[0] + p.slice(1).toLowerCase() }))} />
      </div>
      <Input label="Title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nmsg" className="text-sm font-medium text-ink">Message</label>
        <textarea id="nmsg" rows={4} maxLength={300} className="rounded-lg border border-border bg-surface-raised p-3 text-sm" value={message} onChange={(e) => setMessage(e.target.value)} />
        <span className="text-xs text-ink-muted">{message.length}/300</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Event" placeholder="None" value={eventId} onChange={(e) => { setEventId(e.target.value); setGhatId(""); }} options={events.map((e) => ({ value: e.id, label: e.name }))} />
        <Select label="Location (ghat)" placeholder="None" value={ghatId} disabled={!eventId} onChange={(e) => setGhatId(e.target.value)} options={ghats.map((g) => ({ value: g.id, label: g.name }))} />
      </div>

      <Select
        label="Send to"
        value={audience}
        onChange={(e) => setAudience(e.target.value as typeof audience)}
        options={[
          { value: "FOLLOWERS", label: ghatId ? "Followers of the chosen ghat" : "Followers of the chosen event" },
          { value: "ALL", label: "Everyone (respecting their preferences)" },
          { value: "ROLES", label: "Specific roles" },
          { value: "USER", label: "One user (by user ID)" },
        ]}
      />
      {audience === "ROLES" && (
        <fieldset className="flex flex-wrap gap-3 text-sm">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-1.5">
              <input type="checkbox" checked={roles.includes(r)} onChange={(e) => setRoles((prev) => (e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)))} />
              {r}
            </label>
          ))}
        </fieldset>
      )}
      {audience === "USER" && <Input label="User ID" value={uid} onChange={(e) => setUid(e.target.value)} />}

      <Input label="Schedule (optional — empty sends now)" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={sendPush} onChange={(e) => setSendPush(e.target.checked)} />
        Also send as a push notification (to people who enabled it)
      </label>
      {category === "MARKETING" && <p className="text-xs text-ink-muted">Promotions reach only people who opted in to them.</p>}
      {category === "EMERGENCY" && (
        <label className="flex items-start gap-2 rounded-lg border border-status-critical bg-red-50 p-3 text-sm">
          <input type="checkbox" className="mt-1" checked={confirmEmergency} onChange={(e) => setConfirmEmergency(e.target.checked)} />
          <span>This is a genuine emergency alert. It goes into everyone&apos;s inbox regardless of their preferences. Only state verified information — never guess.</span>
        </label>
      )}

      {error && <p role="alert" className="text-sm text-status-critical">{error}</p>}
      <div>
        <Button disabled={busy} variant={category === "EMERGENCY" ? "danger" : "primary"} onClick={submit}>
          {busy ? "Working..." : scheduleAt ? "Schedule" : "Send now"}
        </Button>
      </div>
    </Card>
  );
}
