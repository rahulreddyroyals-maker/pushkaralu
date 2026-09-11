"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, Badge } from "@/components/ui";
import { LocalizedTextField } from "@/components/admin/LocalizedTextField";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { purohitInputSchema, type PurohitInput } from "@/features/purohits/schemas";
import type { Purohit } from "@/features/purohits/types";
import type { Ritual } from "@/features/rituals/types";

interface PurohitFormProps {
  initial?: Purohit;
  availableRituals: Ritual[];
}

const emptyLocalized = { en: "", te: "" };

export function PurohitForm({ initial, availableRituals }: PurohitFormProps) {
  const router = useRouter();
  const [photo, setPhoto] = useState<string[]>(initial?.photo ? [initial.photo] : []);
  const [languageInput, setLanguageInput] = useState("");
  const [form, setForm] = useState({
    name: initial?.name ?? emptyLocalized,
    bio: initial?.bio ?? emptyLocalized,
    languages: initial?.languages ?? [],
    experienceYears: initial?.experienceYears ?? 0,
    latitude: initial?.location?.latitude ?? 16.9891,
    longitude: initial?.location?.longitude ?? 81.7799,
    address: initial?.address ?? "",
    contactPhone: initial?.contactPhone ?? "",
    ritualIds: initial?.ritualIds ?? [],
    pricingNote: initial?.pricingNote ?? emptyLocalized,
    availabilityNote: initial?.availabilityNote ?? emptyLocalized,
    seoTitle: initial?.seo?.title ?? emptyLocalized,
    seoDescription: initial?.seo?.description ?? emptyLocalized,
    canonicalPath: initial?.seo?.canonicalPath ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addLanguage() {
    const trimmed = languageInput.trim();
    if (!trimmed) return;
    setForm((prev) => ({ ...prev, languages: [...prev.languages, trimmed] }));
    setLanguageInput("");
  }

  function toggleRitual(ritualId: string) {
    setForm((prev) => ({
      ...prev,
      ritualIds: prev.ritualIds.includes(ritualId) ? prev.ritualIds.filter((r) => r !== ritualId) : [...prev.ritualIds, ritualId],
    }));
  }

  async function handleSubmit() {
    setError(null);
    const parsed = purohitInputSchema.safeParse({ ...form, photo: photo[0] ?? "" });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const url = initial ? `/api/purohits/${initial.id}` : "/api/purohits";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data satisfies PurohitInput),
      });
      if (!res.ok) throw new Error("Request failed");
      router.push("/provider");
      router.refresh();
    } catch {
      setError("Couldn't save your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg" className="flex max-w-2xl flex-col gap-5">
      {initial && (
        <Badge tone={initial.approvalStatus === "VERIFIED" ? "success" : initial.approvalStatus === "REJECTED" ? "danger" : "neutral"} className="w-fit">
          {initial.approvalStatus}
        </Badge>
      )}
      {error && <p className="text-sm text-status-critical">{error}</p>}

      <LocalizedTextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} error={fieldErrors.name} />
      <LocalizedTextField label="Bio" value={form.bio} onChange={(bio) => setForm({ ...form, bio })} multiline error={fieldErrors.bio} />

      <div>
        <span className="mb-2 block text-sm font-medium text-ink">Languages</span>
        <div className="mb-2 flex flex-wrap gap-2">
          {form.languages.map((l) => (
            <button key={l} type="button" onClick={() => setForm({ ...form, languages: form.languages.filter((x) => x !== l) })}>
              <Badge tone="info">{l} ✕</Badge>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={languageInput}
            onChange={(e) => setLanguageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())}
            placeholder="e.g. Telugu"
          />
          <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
            Add
          </Button>
        </div>
        {fieldErrors.languages && <p className="mt-1 text-xs text-status-critical">{fieldErrors.languages}</p>}
      </div>

      <Input
        label="Years of experience"
        type="number"
        value={form.experienceYears}
        onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
        error={fieldErrors.experienceYears}
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
      <Input
        label="Contact phone"
        value={form.contactPhone}
        onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
        error={fieldErrors.contactPhone}
        hint="Not shown publicly — used to relay inquiries to you."
      />

      <div>
        <span className="mb-2 block text-sm font-medium text-ink">Rituals you offer</span>
        {availableRituals.length === 0 && <p className="text-sm text-ink-muted">No rituals published in the catalog yet.</p>}
        <div className="flex flex-wrap gap-2">
          {availableRituals.map((r) => (
            <button key={r.id} type="button" onClick={() => toggleRitual(r.id)}>
              <Badge tone={form.ritualIds.includes(r.id) ? "success" : "neutral"}>{r.name.en}</Badge>
            </button>
          ))}
        </div>
      </div>

      <LocalizedTextField label="Pricing note" value={form.pricingNote} onChange={(pricingNote) => setForm({ ...form, pricingNote })} multiline />
      <LocalizedTextField label="Availability note" value={form.availabilityNote} onChange={(availabilityNote) => setForm({ ...form, availabilityNote })} multiline />

      <div>
        <span className="mb-2 block text-sm font-medium text-ink">Photo</span>
        {/* Reuses the multi-image uploader for a single photo — only the first upload is used (see photo[0] in handleSubmit). Acceptable reuse rather than building a single-image variant; if a purohit uploads more than one, only the first is stored. */}
        {initial ? (
          <ImageUploader entityType="purohits" entityId={initial.id} images={photo} onChange={setPhoto} />
        ) : (
          <p className="text-sm text-ink-muted">Save your profile first, then edit it to add a photo.</p>
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
            placeholder="/purohits/example-purohit"
            error={fieldErrors.canonicalPath}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Submit for approval"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/provider")}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
