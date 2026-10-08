"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select } from "@/components/ui";
import { createReportSchema } from "@/features/lostFound/schemas";
import { LOST_FOUND_CATEGORIES, LOST_FOUND_CATEGORY_LABELS, URGENT_CATEGORIES, type LostFoundCategory } from "@/features/lostFound/types";

const textareaClass =
  "min-h-28 w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20";

export function ReportForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    category: "PHONE" as LostFoundCategory,
    reportType: "LOST",
    title: "",
    description: "",
    lastSeenPlace: "",
    lastSeenAt: "",
    contactPhone: "",
    subjectName: "",
    subjectAge: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const urgent = URGENT_CATEGORIES.includes(form.category);

  async function submit() {
    setFormError(null);
    const payload = {
      category: form.category,
      reportType: form.reportType,
      title: form.title,
      description: form.description,
      lastSeenPlace: form.lastSeenPlace,
      lastSeenAt: form.lastSeenAt ? new Date(form.lastSeenAt).toISOString() : "",
      contactPhone: form.contactPhone,
      ...(urgent && form.subjectName ? { subjectName: form.subjectName } : {}),
      ...(urgent && form.subjectAge !== "" ? { subjectAge: Number(form.subjectAge) } : {}),
    };
    const parsed = createReportSchema.safeParse(payload);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0])] ??= issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/lost-found", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "failed");
      router.push(`/lost-and-found/${body.id}`);
    } catch (e) {
      setFormError(e instanceof Error && e.message !== "failed" ? e.message : "Couldn't submit your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg" className="flex flex-col gap-5">
      {urgent && (
        <p role="note" className="rounded-lg bg-[rgba(201,59,59,0.08)] p-3 text-sm text-ink">
          If someone is missing or in danger, <a className="font-semibold text-status-critical underline" href="/emergency">call emergency services now</a>. Reports about people are reviewed first, but review is not instant.
        </p>
      )}
      <p className="text-sm text-ink-muted">
        Privacy: your phone number and the full details you enter stay private to you and our moderators. Only a short summary written by a moderator is shown publicly, and it never includes phone numbers or ID numbers.
      </p>
      {formError && <p role="alert" className="text-sm text-status-critical">{formError}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="What happened?"
          value={form.reportType}
          onChange={(e) => setForm({ ...form, reportType: e.target.value })}
          options={[
            { value: "LOST", label: "I lost something / someone" },
            { value: "FOUND", label: "I found something / someone" },
          ]}
        />
        <Select
          label="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as LostFoundCategory })}
          options={LOST_FOUND_CATEGORIES.map((c) => ({ value: c, label: LOST_FOUND_CATEGORY_LABELS[c] }))}
        />
      </div>
      <Input label="Short title" value={form.title} error={errors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="lf-desc">Details (private)</label>
        <textarea id="lf-desc" className={textareaClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {errors.description && <p className="mt-1 text-xs text-status-critical">{errors.description}</p>}
      </div>
      {urgent && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name (private)" value={form.subjectName} error={errors.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })} />
          <Input label="Age (private)" type="number" value={form.subjectAge} error={errors.subjectAge} onChange={(e) => setForm({ ...form, subjectAge: e.target.value })} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Last seen at (place)" value={form.lastSeenPlace} error={errors.lastSeenPlace} onChange={(e) => setForm({ ...form, lastSeenPlace: e.target.value })} />
        <Input label="Last seen (date & time)" type="datetime-local" value={form.lastSeenAt} error={errors.lastSeenAt} onChange={(e) => setForm({ ...form, lastSeenAt: e.target.value })} />
      </div>
      <Input
        label="Your phone number (private)"
        value={form.contactPhone}
        error={errors.contactPhone}
        hint="Used only by moderators to reach you. Never shown publicly."
        onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
      />
      <div>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit for review"}
        </Button>
      </div>
    </Card>
  );
}
