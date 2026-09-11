"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, Badge } from "@/components/ui";
import { LocalizedTextField } from "@/components/admin/LocalizedTextField";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { hotelInputSchema, type HotelInput } from "@/features/hotels/schemas";
import { HOTEL_AMENITIES, type Hotel } from "@/features/hotels/types";

const AMENITY_LABELS: Record<string, string> = {
  wifi: "WiFi",
  ac: "AC",
  parking: "Parking",
  restaurant: "Restaurant",
  room_service: "Room service",
  hot_water: "Hot water",
  elevator: "Elevator",
  pilgrim_friendly_timings: "Pilgrim-friendly timings",
};

interface HotelFormProps {
  initial?: Hotel;
}

const emptyLocalized = { en: "", te: "" };

export function HotelForm({ initial }: HotelFormProps) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [form, setForm] = useState({
    name: initial?.name ?? emptyLocalized,
    description: initial?.description ?? emptyLocalized,
    address: initial?.address ?? "",
    latitude: initial?.location?.latitude ?? 16.9891,
    longitude: initial?.location?.longitude ?? 81.7799,
    contactPhone: initial?.contactPhone ?? "",
    amenities: initial?.amenities ?? [],
    priceRangeMin: initial?.priceRangeMin ?? 500,
    priceRangeMax: initial?.priceRangeMax ?? 2000,
    policies: initial?.policies ?? emptyLocalized,
    seoTitle: initial?.seo?.title ?? emptyLocalized,
    seoDescription: initial?.seo?.description ?? emptyLocalized,
    canonicalPath: initial?.seo?.canonicalPath ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleAmenity(a: string) {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a as never) ? prev.amenities.filter((x) => x !== a) : [...prev.amenities, a as never],
    }));
  }

  async function handleSubmit() {
    setError(null);
    const parsed = hotelInputSchema.safeParse({ ...form, images });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const url = initial ? `/api/hotels/${initial.id}` : "/api/hotels";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data satisfies HotelInput),
      });
      if (!res.ok) throw new Error("Request failed");
      router.push("/provider");
      router.refresh();
    } catch {
      setError("Couldn't save your listing. Please try again.");
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

      <LocalizedTextField label="Hotel name" value={form.name} onChange={(name) => setForm({ ...form, name })} error={fieldErrors.name} />
      <LocalizedTextField
        label="Description"
        value={form.description}
        onChange={(description) => setForm({ ...form, description })}
        multiline
        error={fieldErrors.description}
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

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Price min (₹/night)"
          type="number"
          value={form.priceRangeMin}
          onChange={(e) => setForm({ ...form, priceRangeMin: Number(e.target.value) })}
          error={fieldErrors.priceRangeMin}
        />
        <Input
          label="Price max (₹/night)"
          type="number"
          value={form.priceRangeMax}
          onChange={(e) => setForm({ ...form, priceRangeMax: Number(e.target.value) })}
          error={fieldErrors.priceRangeMax}
        />
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-ink">Amenities</span>
        <div className="flex flex-wrap gap-2">
          {HOTEL_AMENITIES.map((a) => (
            <button key={a} type="button" onClick={() => toggleAmenity(a)}>
              <Badge tone={form.amenities.includes(a as never) ? "success" : "neutral"}>{AMENITY_LABELS[a]}</Badge>
            </button>
          ))}
        </div>
      </div>

      <LocalizedTextField label="Policies" value={form.policies} onChange={(policies) => setForm({ ...form, policies })} multiline />

      <div>
        <span className="mb-2 block text-sm font-medium text-ink">Photos</span>
        {initial ? (
          <ImageUploader entityType="hotels" entityId={initial.id} images={images} onChange={setImages} />
        ) : (
          <p className="text-sm text-ink-muted">Save your listing first, then edit it to add photos.</p>
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
            placeholder="/hotels/example-hotel"
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
