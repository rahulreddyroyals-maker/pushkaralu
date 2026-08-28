"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, Badge } from "@/components/ui";
import { LocalizedTextField } from "@/components/admin/LocalizedTextField";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { templeInputSchema, type TempleInput } from "@/features/temples/schemas";
import type { Temple } from "@/features/temples/types";

interface TempleFormProps {
  initial?: Temple;
}

const emptyLocalized = { en: "", te: "" };

export function TempleForm({ initial }: TempleFormProps) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [attractionInput, setAttractionInput] = useState("");
  const [form, setForm] = useState({
    name: initial?.name ?? emptyLocalized,
    description: initial?.description ?? emptyLocalized,
    history: initial?.history ?? emptyLocalized,
    timings: initial?.timings ?? "",
    latitude: initial?.location?.latitude ?? 16.9891,
    longitude: initial?.location?.longitude ?? 81.7799,
    address: initial?.address ?? "",
    nearbyAttractions: initial?.nearbyAttractions ?? [],
    seoTitle: initial?.seo?.title ?? emptyLocalized,
    seoDescription: initial?.seo?.description ?? emptyLocalized,
    canonicalPath: initial?.seo?.canonicalPath ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addAttraction() {
    const trimmed = attractionInput.trim();
    if (!trimmed) return;
    setForm((prev) => ({ ...prev, nearbyAttractions: [...prev.nearbyAttractions, trimmed] }));
    setAttractionInput("");
  }

  function removeAttraction(name: string) {
    setForm((prev) => ({ ...prev, nearbyAttractions: prev.nearbyAttractions.filter((a) => a !== name) }));
  }

  async function handleSubmit() {
    setError(null);
    const parsed = templeInputSchema.safeParse({ ...form, images });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const url = initial ? `/api/admin/temples/${initial.id}` : "/api/admin/temples";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data satisfies TempleInput),
      });
      if (!res.ok) throw new Error("Request failed");
      router.push("/admin/temples");
      router.refresh();
    } catch {
      setError("Couldn't save the temple. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg" className="flex max-w-2xl flex-col gap-5">
      {error && <p className="text-sm text-status-critical">{error}</p>}

      <LocalizedTextField label="Temple name" value={form.name} onChange={(name) => setForm({ ...form, name })} error={fieldErrors.name} />
      <LocalizedTextField
        label="Description"
        value={form.description}
        onChange={(description) => setForm({ ...form, description })}
        multiline
        error={fieldErrors.description}
      />
      <LocalizedTextField label="History" value={form.history} onChange={(history) => setForm({ ...form, history })} multiline error={fieldErrors.history} />

      <Input
        label="Timings"
        value={form.timings}
        onChange={(e) => setForm({ ...form, timings: e.target.value })}
        placeholder="6:00 AM - 12:00 PM, 4:00 PM - 8:00 PM"
        error={fieldErrors.timings}
      />
      <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} error={fieldErrors.address} />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Latitude"
          type="number"
          step="0.00001"
          value={form.latitude}
          onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
          error={fieldErrors.latitude}
        />
        <Input
          label="Longitude"
          type="number"
          step="0.00001"
          value={form.longitude}
          onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
          error={fieldErrors.longitude}
        />
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-ink">Nearby attractions</span>
        <div className="mb-2 flex flex-wrap gap-2">
          {form.nearbyAttractions.map((a) => (
            <button key={a} type="button" onClick={() => removeAttraction(a)}>
              <Badge tone="info">{a} ✕</Badge>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={attractionInput}
            onChange={(e) => setAttractionInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttraction())}
            placeholder="Add an attraction name..."
          />
          <Button type="button" variant="outline" size="sm" onClick={addAttraction}>
            Add
          </Button>
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-ink">Images</span>
        {initial ? (
          <ImageUploader entityType="temples" entityId={initial.id} images={images} onChange={setImages} />
        ) : (
          <p className="text-sm text-ink-muted">Save the temple first, then edit it to add images.</p>
        )}
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
            placeholder="/temples/example-temple"
            error={fieldErrors.canonicalPath}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Create temple"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/admin/temples")}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
