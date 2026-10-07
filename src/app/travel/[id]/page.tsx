import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DetailShell, Section, Facts, catalogMetadata, pick } from "@/components/catalog/DetailShell";
import { DirectionsButton } from "@/components/catalog/DirectionsButton";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { LeadForm } from "@/components/marketplace/LeadForm";
import { loadPublic } from "@/features/catalog/publicApi";
import { TRANSPORT_KIND_LABELS, PRICING_MODEL_LABELS, type TransportService } from "@/features/transport/definition";
import { priceText } from "@/features/catalog/cards";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const t = await loadPublic<TransportService>("transport", id);
  return catalogMetadata(t, t ? pick(t.name) : "", t ? pick(t.description) : "");
}

export default async function TransportDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await loadPublic<TransportService>("transport", id);
  if (!t) notFound();

  return (
    <DetailShell
      crumbs={[{ label: "Travel", href: "/travel" }, { label: pick(t.name) }]}
      title={pick(t.name)}
      subtitle={pick(t.serviceArea) || t.address}
      badges={[{ label: TRANSPORT_KIND_LABELS[t.kind], tone: "info" }]}
      images={t.images}
    >
      <p className="text-ink-muted">{pick(t.description)}</p>

      <Section title="Fare & service">
        <Facts
          rows={[
            ["Pricing", PRICING_MODEL_LABELS[t.pricingModel]],
            ["Indicative amount", t.pricingModel === "ON_REQUEST" ? "Price on request" : priceText(t.amountInr)],
            ["Pricing note", pick(t.pricingNote)],
            ["Vehicle", t.vehicleType],
            ["Seats", t.seatingCapacity ? String(t.seatingCapacity) : undefined],
            ["Operating hours", t.operatingHours],
          ]}
        />
        <p className="mt-3 text-xs">Prices are indicative and set by the operator. Confirm the final fare before you travel.</p>
      </Section>

      {t.departures.length > 0 && (
        <Section title="Timetable">
          <ul className="divide-y divide-border">
            {t.departures.map((d, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="text-ink">
                  {d.from} → {d.to}
                  {d.notes ? <span className="text-ink-muted"> · {d.notes}</span> : null}
                </span>
                <span className="font-data text-ink">{d.time}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs">Timetable entered by our team — services can change; check before travelling.</p>
        </Section>
      )}

      <div>
        <MapEmbed location={t.location} label={t.name.en} />
        <div className="mt-3">
          <DirectionsButton location={t.location} label="Directions to pickup point" />
        </div>
      </div>

      <div className="max-w-md">
        <LeadForm providerId={t.id} providerType="transport" recipientLabel="our team" />
      </div>
    </DetailShell>
  );
}
