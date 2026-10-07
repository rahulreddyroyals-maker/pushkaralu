import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DetailShell, Section, Facts, BadgeList, catalogMetadata, pick } from "@/components/catalog/DetailShell";
import { DirectionsButton } from "@/components/catalog/DirectionsButton";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { loadPublic } from "@/features/catalog/publicApi";
import {
  PARKING_STATUS_LABELS, PARKING_TYPE_LABELS, PRICING_UNIT_LABELS, VEHICLE_TYPE_LABELS, type ParkingLocation,
} from "@/features/parking/definition";
import { PARKING_STATUS_TONE, priceText } from "@/features/catalog/cards";
import { formatDistance, formatRelativeTime, isStale } from "@/lib/catalog/format";
import { MANUAL_STATUS_STALE_HOURS } from "@/config/app";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await loadPublic<ParkingLocation>("parking", id);
  return catalogMetadata(p, p ? pick(p.name) : "", p ? pick(p.description) : "");
}

export default async function ParkingDetailPage({ params }: Props) {
  const { id } = await params;
  const p = await loadPublic<ParkingLocation>("parking", id);
  if (!p) notFound();

  const updated = formatRelativeTime(p.statusUpdatedAt);
  const stale = isStale(p.statusUpdatedAt, MANUAL_STATUS_STALE_HOURS);

  return (
    <DetailShell
      crumbs={[{ label: "Parking", href: "/parking" }, { label: pick(p.name) }]}
      title={pick(p.name)}
      subtitle={p.address}
      badges={[
        { label: PARKING_STATUS_LABELS[p.status], tone: PARKING_STATUS_TONE[p.status] },
        { label: PARKING_TYPE_LABELS[p.parkingType], tone: "neutral" },
      ]}
      images={p.images}
    >
      <p className="text-xs text-ink-muted">
        Status entered by our team{updated ? ` — updated ${updated}` : ""}.{stale ? " This may be outdated; check on arrival." : ""}
      </p>
      {pick(p.description) && <p className="text-ink-muted">{pick(p.description)}</p>}

      <Section title="Capacity & timings">
        <Facts
          rows={[
            ["Capacity", `${p.capacity} vehicles`],
            ["Note", p.capacityNote],
            ["Hours", p.opensAt && p.closesAt ? `${p.opensAt} – ${p.closesAt}` : undefined],
          ]}
        />
        <div className="mt-3">
          <BadgeList items={p.vehicleTypes.map((v) => VEHICLE_TYPE_LABELS[v])} />
        </div>
      </Section>

      <Section title="Pricing">
        {p.pricing.length === 0 ? (
          <p>Pricing not published — confirm at the entrance.</p>
        ) : (
          <ul className="divide-y divide-border">
            {p.pricing.map((rate, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="text-ink">{VEHICLE_TYPE_LABELS[rate.vehicleType]}</span>
                <span className="font-data text-ink">
                  {rate.unit === "free" ? "Free" : `${priceText(rate.amountInr)} ${PRICING_UNIT_LABELS[rate.unit]}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {p.ghatDistances.length > 0 && (
        <Section title="Distance to ghats">
          <ul className="divide-y divide-border">
            {p.ghatDistances.map((g, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="text-ink">{g.ghatName}</span>
                <span className="font-data text-ink">
                  ~{formatDistance(g.distanceMeters)}
                  {g.walkMinutes ? ` · ${g.walkMinutes} min walk` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs">Approximate walking distances measured by our team.</p>
        </Section>
      )}

      {p.facilities.length > 0 && (
        <Section title="Facilities">
          <BadgeList items={p.facilities} />
        </Section>
      )}

      <div>
        <MapEmbed location={p.location} label={p.name.en} />
        <div className="mt-3">
          <DirectionsButton location={p.location} label="Navigate to parking" />
        </div>
      </div>
    </DetailShell>
  );
}
