"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Card } from "@/components/ui";
import { LocalizedTextField } from "@/components/admin/LocalizedTextField";
import { eventInputSchema, type EventInput } from "@/features/events/schemas";
import type { PushkaraluEvent } from "@/types/domain";

interface EventFormProps {
  initial?: PushkaraluEvent;
}

const emptyLocalized = { en: "", te: "" };

export function EventForm({ initial }: EventFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial?.name ?? emptyLocalized,
    river: initial?.river ?? "GODAVARI",
    year: initial?.year ?? new Date().getFullYear() + 1,
    startDate: initial?.startDate?.slice(0, 10) ?? "",
    endDate: initial?.endDate?.slice(0, 10) ?? "",
    description: initial?.description ?? emptyLocalized,
    status: initial?.status ?? "UPCOMING",
    featuredImage: initial?.featuredImage ?? "",
    seoTitle: initial?.seo?.title ?? emptyLocalized,
    seoDescription: initial?.seo?.description ?? emptyLocalized,
    canonicalPath: initial?.seo?.canonicalPath ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = eventInputSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const url = initial ? `/api/admin/events/${initial.id}` : "/api/admin/events";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data satisfies EventInput),
      });
      if (!res.ok) throw new Error("Request failed");
      router.push("/admin/events");
      router.refresh();
    } catch {
      setError("Couldn't save the event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg" className="flex max-w-2xl flex-col gap-5">
      {error && <p className="text-sm text-status-critical">{error}</p>}

      <LocalizedTextField label="Event name" value={form.name} onChange={(name) => setForm({ ...form, name })} error={fieldErrors.name} />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="River"
          value={form.river}
          onChange={(e) => setForm({ ...form, river: e.target.value as typeof form.river })}
          options={[
            { value: "GODAVARI", label: "Godavari" },
            { value: "KRISHNA", label: "Krishna" },
            { value: "TUNGABHADRA", label: "Tungabhadra" },
            { value: "OTHER", label: "Other" },
          ]}
        />
        <Input
          label="Year"
          type="number"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
          error={fieldErrors.year}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start date"
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          error={fieldErrors.startDate}
        />
        <Input
          label="End date"
          type="date"
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          error={fieldErrors.endDate}
        />
      </div>

      <LocalizedTextField
        label="Description"
        value={form.description}
        onChange={(description) => setForm({ ...form, description })}
        multiline
        error={fieldErrors.description}
      />

      <Select
        label="Lifecycle status"
        value={form.status}
        onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
        options={[
          { value: "UPCOMING", label: "Upcoming" },
          { value: "ACTIVE", label: "Active" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />

      <Input
        label="Featured image URL"
        value={form.featuredImage}
        onChange={(e) => setForm({ ...form, featuredImage: e.target.value })}
        hint="Upload images from the ghat/temple editors — events use a single featured image URL for now."
      />

      <div className="border-t border-border pt-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">SEO</h3>
        <div className="flex flex-col gap-4">
          <LocalizedTextField label="SEO title" value={form.seoTitle} onChange={(seoTitle) => setForm({ ...form, seoTitle })} error={fieldErrors.seoTitle} />
          <LocalizedTextField
            label="SEO description"
            value={form.seoDescription}
            onChange={(seoDescription) => setForm({ ...form, seoDescription })}
            multiline
            error={fieldErrors.seoDescription}
          />
          <Input
            label="Canonical path"
            value={form.canonicalPath}
            onChange={(e) => setForm({ ...form, canonicalPath: e.target.value })}
            placeholder="/godavari-pushkaralu-2027"
            error={fieldErrors.canonicalPath}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Create event"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/admin/events")}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
