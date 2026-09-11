"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, Select } from "@/components/ui";
import { LocalizedTextField } from "@/components/admin/LocalizedTextField";
import { ritualInputSchema, type RitualInput } from "@/features/rituals/schemas";
import { RITUAL_CATEGORIES, type Ritual } from "@/features/rituals/types";

interface RitualFormProps {
  initial?: Ritual;
}

const emptyLocalized = { en: "", te: "" };

const CATEGORY_LABELS: Record<string, string> = {
  pinda_pradanam: "Pinda Pradanam",
  tarpanam: "Tarpanam",
  pitru_karma: "Pitru Karma",
  shraddha: "Shraddha",
  homam: "Homam",
  pooja: "Pooja",
  satyanarayana_vratham: "Satyanarayana Vratham",
  other: "Other",
};

export function RitualForm({ initial }: RitualFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial?.name ?? emptyLocalized,
    description: initial?.description ?? emptyLocalized,
    category: initial?.category ?? "pooja",
    typicalDurationMinutes: initial?.typicalDurationMinutes ?? 60,
    indicativePriceMin: initial?.indicativePriceMin ?? 500,
    indicativePriceMax: initial?.indicativePriceMax ?? 2000,
    seoTitle: initial?.seo?.title ?? emptyLocalized,
    seoDescription: initial?.seo?.description ?? emptyLocalized,
    canonicalPath: initial?.seo?.canonicalPath ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = ritualInputSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const url = initial ? `/api/admin/rituals/${initial.id}` : "/api/admin/rituals";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data satisfies RitualInput),
      });
      if (!res.ok) throw new Error("Request failed");
      router.push("/admin/rituals");
      router.refresh();
    } catch {
      setError("Couldn't save the ritual. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg" className="flex max-w-2xl flex-col gap-5">
      {error && <p className="text-sm text-status-critical">{error}</p>}

      <LocalizedTextField label="Ritual name" value={form.name} onChange={(name) => setForm({ ...form, name })} error={fieldErrors.name} />
      <LocalizedTextField
        label="Description"
        value={form.description}
        onChange={(description) => setForm({ ...form, description })}
        multiline
        error={fieldErrors.description}
      />

      <Select
        label="Category"
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}
        options={RITUAL_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
      />

      <Input
        label="Typical duration (minutes)"
        type="number"
        value={form.typicalDurationMinutes}
        onChange={(e) => setForm({ ...form, typicalDurationMinutes: Number(e.target.value) })}
        error={fieldErrors.typicalDurationMinutes}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Indicative price min (₹)"
          type="number"
          value={form.indicativePriceMin}
          onChange={(e) => setForm({ ...form, indicativePriceMin: Number(e.target.value) })}
          error={fieldErrors.indicativePriceMin}
        />
        <Input
          label="Indicative price max (₹)"
          type="number"
          value={form.indicativePriceMax}
          onChange={(e) => setForm({ ...form, indicativePriceMax: Number(e.target.value) })}
          error={fieldErrors.indicativePriceMax}
        />
      </div>

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
            placeholder="/rituals/example-ritual"
            error={fieldErrors.canonicalPath}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Create ritual"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/admin/rituals")}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
