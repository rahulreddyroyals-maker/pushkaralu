import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DetailShell, Section, Facts, BadgeList, catalogMetadata, pick } from "@/components/catalog/DetailShell";
import { DirectionsButton } from "@/components/catalog/DirectionsButton";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { loadPublic } from "@/features/catalog/publicApi";
import { DIET_TYPE_LABELS, PRICE_CATEGORY_LABELS, type Restaurant } from "@/features/restaurants/definition";
import { computeOpenState } from "@/lib/catalog/openStatus";
import { formatDistance, formatInr } from "@/lib/catalog/format";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await loadPublic<Restaurant>("restaurants", id);
  return catalogMetadata(r, r ? pick(r.name) : "", r ? pick(r.description) : "");
}

export default async function RestaurantDetailPage({ params }: Props) {
  const { id } = await params;
  const r = await loadPublic<Restaurant>("restaurants", id);
  if (!r) notFound();

  const open = computeOpenState(r);
  const badges: { label: string; tone?: "success" | "neutral" | "info" | "saffron" }[] = [
    { label: DIET_TYPE_LABELS[r.dietType], tone: r.dietType === "PURE_VEG" ? "success" : "neutral" },
    { label: PRICE_CATEGORY_LABELS[r.priceCategory], tone: "info" },
  ];
  if (open !== "UNKNOWN") badges.unshift({ label: open === "OPEN" ? "Open now" : "Closed now", tone: open === "OPEN" ? "success" : "neutral" });
  if (r.familyFriendly) badges.push({ label: "Family friendly", tone: "saffron" });

  return (
    <DetailShell crumbs={[{ label: "Restaurants", href: "/restaurants" }, { label: pick(r.name) }]} title={pick(r.name)} subtitle={r.address} badges={badges} images={r.images}>
      <p className="text-ink-muted">{pick(r.description)}</p>

      <Section title="Details">
        <Facts
          rows={[
            ["Hours", r.opensAt && r.closesAt ? `${r.opensAt} – ${r.closesAt}` : undefined],
            ["Closed on", r.closedDays.length ? r.closedDays.join(", ") : undefined],
            ["Status note", r.temporarilyClosed ? "Temporarily closed" : undefined],
            ["Cost for two", r.averageCostForTwoInr === undefined ? undefined : `~${formatInr(r.averageCostForTwoInr)}`],
            [
              "Near",
              r.nearbyGhatName ? `${r.nearbyGhatName}${r.distanceFromGhatMeters !== undefined ? ` (~${formatDistance(r.distanceFromGhatMeters)})` : ""}` : undefined,
            ],
            ["Phone", r.phone ? <a key="tel" className="text-river-current hover:underline" href={`tel:${r.phone}`}>{r.phone}</a> : undefined],
          ]}
        />
        <p className="mt-3 text-xs">Open/closed is calculated from the published hours (India time) and may differ on festival days — call ahead if it matters.</p>
      </Section>

      {r.cuisines.length > 0 && (
        <Section title="Cuisines">
          <BadgeList items={r.cuisines} />
        </Section>
      )}

      {(r.menuHighlights.length > 0 || r.menuUrl) && (
        <Section title="Menu">
          {r.menuHighlights.length > 0 && (
            <ul className="divide-y divide-border">
              {r.menuHighlights.map((d, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span className="text-ink">
                    {d.name} <span aria-label={d.vegetarian ? "vegetarian" : "non-vegetarian"}>{d.vegetarian ? "🟢" : "🔴"}</span>
                  </span>
                  <span className="font-data text-ink">{d.priceInr === undefined ? "—" : formatInr(d.priceInr)}</span>
                </li>
              ))}
            </ul>
          )}
          {r.menuUrl && (
            <a className="mt-3 inline-block text-river-current hover:underline" href={r.menuUrl} target="_blank" rel="noopener noreferrer">
              View full menu
            </a>
          )}
        </Section>
      )}

      <div>
        <MapEmbed location={r.location} label={r.name.en} />
        <div className="mt-3">
          <DirectionsButton location={r.location} />
        </div>
      </div>
    </DetailShell>
  );
}
