import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { DetailShell, Section, Facts, catalogMetadata, pick } from "@/components/catalog/DetailShell";
import { LeadForm } from "@/components/marketplace/LeadForm";
import { loadPublic } from "@/features/catalog/publicApi";
import type { Itinerary, TravelPackage } from "@/features/tourism/definition";
import { formatInr } from "@/lib/catalog/format";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await loadPublic<TravelPackage>("packages", id);
  return catalogMetadata(p, p ? pick(p.title) : "", p ? pick(p.summary) : "");
}

export default async function PackageDetailPage({ params }: Props) {
  const { id } = await params;
  const pkg = await loadPublic<TravelPackage>("packages", id);
  if (!pkg) notFound();
  const itinerary = pkg.itineraryId ? await loadPublic<Itinerary>("itineraries", pkg.itineraryId) : null;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = pkg.departures.filter((d) => d.date.slice(0, 10) >= today);

  return (
    <DetailShell
      crumbs={[{ label: "Packages", href: "/packages" }, { label: pick(pkg.title) }]}
      title={pick(pkg.title)}
      subtitle={pick(pkg.summary)}
      badges={[{ label: `${pkg.durationDays} days / ${pkg.nights} nights`, tone: "info" }]}
      images={pkg.images}
    >
      <p className="text-ink-muted">{pick(pkg.description)}</p>

      <Section title="Price & details">
        <Facts
          rows={[
            ["From (per person)", pkg.priceFromInr === undefined ? "Price on request" : formatInr(pkg.priceFromInr)],
            ["Price note", pick(pkg.priceNote)],
            ["Departure city", pkg.departureCity],
            ["Operated by", pkg.operatorName],
          ]}
        />
        <p className="mt-3 text-xs">Prices are indicative. The final price and availability are confirmed when you inquire.</p>
      </Section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Section title="Included">
          {pkg.inclusions.length ? <ul className="list-disc pl-5">{pkg.inclusions.map((i) => <li key={i}>{i}</li>)}</ul> : <p>Not specified</p>}
        </Section>
        <Section title="Not included">
          {pkg.exclusions.length ? <ul className="list-disc pl-5">{pkg.exclusions.map((i) => <li key={i}>{i}</li>)}</ul> : <p>Not specified</p>}
        </Section>
      </div>

      <Section title="Departure dates">
        {upcoming.length === 0 ? (
          <p>No upcoming dates published — send an inquiry to ask.</p>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((d, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="font-data text-ink">{new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span>
                <span>{d.note}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {itinerary && (
        <Section title="Itinerary">
          <Link href={`/tourism/itineraries/${itinerary.id}`} className="font-medium text-river-current hover:underline">
            {pick(itinerary.title)} →
          </Link>
        </Section>
      )}

      {pick(pkg.cancellationPolicy) && (
        <Section title="Cancellation policy">
          <p className="text-ink">{pick(pkg.cancellationPolicy)}</p>
        </Section>
      )}

      <div className="max-w-md">
        <LeadForm providerId={pkg.id} providerType="travel_package" recipientLabel="our team" />
      </div>
    </DetailShell>
  );
}
