import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DetailShell, Section, Facts, BadgeList, catalogMetadata, pick } from "@/components/catalog/DetailShell";
import { DirectionsButton } from "@/components/catalog/DirectionsButton";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { loadPublic } from "@/features/catalog/publicApi";
import { PLACE_KIND_LABELS, type TourismPlace } from "@/features/tourism/definition";
import { formatDuration, formatInr } from "@/lib/catalog/format";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await loadPublic<TourismPlace>("tourism", id);
  return catalogMetadata(p, p ? pick(p.name) : "", p ? pick(p.description) : "");
}

export default async function TourismPlacePage({ params }: Props) {
  const { id } = await params;
  const p = await loadPublic<TourismPlace>("tourism", id);
  if (!p) notFound();

  return (
    <DetailShell
      crumbs={[{ label: "Tourism", href: "/tourism" }, { label: pick(p.name) }]}
      title={pick(p.name)}
      subtitle={pick(p.tagline) || p.address}
      badges={[{ label: PLACE_KIND_LABELS[p.kind], tone: p.kind === "TEMPLE" ? "saffron" : "info" }]}
      images={p.images}
    >
      <p className="text-ink-muted">{pick(p.description)}</p>

      {pick(p.significance) && (
        <Section title="Significance">
          <p className="text-ink">{pick(p.significance)}</p>
        </Section>
      )}

      <Section title="Visitor information">
        <Facts
          rows={[
            ["Timings", p.timings],
            ["Best time to visit", pick(p.bestTimeToVisit)],
            ["Suggested visit", p.suggestedDurationMinutes ? formatDuration(p.suggestedDurationMinutes) : undefined],
            ["Entry fee", p.entryFeeInr === undefined ? pick(p.entryFeeNote) : `${p.entryFeeInr === 0 ? "Free" : formatInr(p.entryFeeInr)}${pick(p.entryFeeNote) ? ` — ${pick(p.entryFeeNote)}` : ""}`],
            ["Dress code / etiquette", pick(p.dressCode)],
            ["Getting there", pick(p.distanceNote)],
          ]}
        />
      </Section>

      {p.facilities.length > 0 && (
        <Section title="Facilities">
          <BadgeList items={p.facilities} />
        </Section>
      )}

      <div>
        <MapEmbed location={p.location} label={p.name.en} />
        <div className="mt-3">
          <DirectionsButton location={p.location} />
        </div>
      </div>
    </DetailShell>
  );
}
