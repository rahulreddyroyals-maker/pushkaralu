"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, Badge } from "@/components/ui";
import { LocalizedTextField } from "@/components/admin/LocalizedTextField";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ghatInputSchema, type GhatInput } from "@/features/ghats/schemas";
import { GHAT_FACILITIES, GHAT_FACILITY_LABELS, type Ghat } from "@/features/ghats/types";

interface GhatFormProps {
  eventId: string;
  initial?: Ghat;
}

const emptyLocalized = { en: "", te: "" };

export function GhatForm({ eventId, initial }: GhatFormProps) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [form, setForm] = useState({
    name: initial?.name ?? emptyLocalized,
    description: initial?.description ?? emptyLocalized,
    latitude: initial?.location?.latitude ?? 16.9891,
    longitude: initial?.location?.longitude ?? 81.7799,
    facilities: initial?.facilities ?? [],
    parkingInfo: initial?.parkingInfo ?? emptyLocalized,
    medicalInfo: initial?.medicalInfo ?? emptyLocalized,
    seoTitle: initial?.seo?.title ?? emptyLocalized,
    seoDescription: initial?.seo?.description ?? emptyLocalized,
    canonicalPath: initial?.seo?.canonicalPath ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleFacility(facility: string) {
    setForm((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility as never)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility as never],
    }));
  }

  async function handleSubmit() {
    setError(null);
    const parsed = ghatInputSchema.safeParse({ ...form, images });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const url = initial
        ? `/api/admin/events/${eventId}/ghats/${initial.id}`
        : `/api/admin/events/${eventId}/ghats`;
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data satisfies GhatInput),
      });
      if (!res.ok) throw new Error("Request failed");
      router.push(`/admin/events/${eventId}/ghats`);
      router.refresh();
    } catch {
      setError("Couldn't save the ghat. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg" className="flex max-w-2xl flex-col gap-5">
      {error && <p className="text-sm text-status-critical">{error}</p>}

      <LocalizedTextField label="Ghat name" value={form.name} onChange={(name) => setForm({ ...form, name })} error={fieldErrors.name} />
      <LocalizedTextField
        label="Description"
        value={form.description}
        onChange={(description) => setForm({ ...form, description })}
        multiline
        error={fieldErrors.description}
      />

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
        <span className="mb-2 block text-sm font-medium text-ink">Facilities</span>
        <div className="flex flex-wrap gap-2">
          {GHAT_FACILITIES.map((f) => {
            const active = form.facilities.includes(f as never);
            return (
              <button key={f} type="button" onClick={() => toggleFacility(f)}>
                <Badge tone={active ? "success" : "neutral"}>{GHAT_FACILITY_LABELS[f]}</Badge>
              </button>
            );
          })}
        </div>
      </div>

      <LocalizedTextField label="Parking info" value={form.parkingInfo} onChange={(parkingInfo) => setForm({ ...form, parkingInfo })} multiline />
      <LocalizedTextField label="Medical facilities info" value={form.medicalInfo} onChange={(medicalInfo) => setForm({ ...form, medicalInfo })} multiline />

      <div>
        <span className="mb-2 block text-sm font-medium text-ink">Images</span>
        {initial ? (
          <ImageUploader entityType="ghats" entityId={initial.id} images={images} onChange={setImages} />
        ) : (
          <p className="text-sm text-ink-muted">Save the ghat first, then edit it to add images.</p>
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
            placeholder="/ghats/example-ghat"
            error={fieldErrors.canonicalPath}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Create ghat"}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/admin/events/${eventId}/ghats`)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
