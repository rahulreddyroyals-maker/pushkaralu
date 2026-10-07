import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { DetailShell, Section, BadgeList, catalogMetadata, pick } from "@/components/catalog/DetailShell";
import { loadPublic, loadPublicMany } from "@/features/catalog/publicApi";
import { SUITABLE_FOR_LABELS, type Itinerary, type TourismPlace } from "@/features/tourism/definition";
import { formatDuration } from "@/lib/catalog/format";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const i = await loadPublic<Itinerary>("itineraries", id);
  return catalogMetadata(i, i ? pick(i.title) : "", i ? pick(i.summary) : "");
}

export default async function ItineraryPage({ params }: Props) {
  const { id } = await params;
  const itinerary = await loadPublic<Itinerary>("itineraries", id);
  if (!itinerary) notFound();

  const placeIds = itinerary.days.flatMap((d) => d.stops.map((s) => s.placeId).filter((x): x is string => Boolean(x)));
  const places = await loadPublicMany<TourismPlace>("tourism", placeIds);
  const placeById = new Map(places.map((p) => [p.id, p]));

  return (
    <DetailShell
      crumbs={[{ label: "Tourism", href: "/tourism" }, { label: "Itineraries", href: "/tourism/itineraries" }, { label: pick(itinerary.title) }]}
      title={pick(itinerary.title)}
      subtitle={pick(itinerary.summary)}
      badges={[{ label: itinerary.durationDays <= 1 ? "One day" : `${itinerary.durationDays} days`, tone: "info" }]}
      images={itinerary.images}
    >
      {itinerary.suitableFor.length > 0 && (
        <div>
          <span className="mb-2 block text-xs uppercase tracking-wide text-ink-muted">Suitable for</span>
          <BadgeList items={itinerary.suitableFor.map((s) => SUITABLE_FOR_LABELS[s])} />
        </div>
      )}

      {itinerary.days.map((day, dayIndex) => (
        <Section key={dayIndex} title={itinerary.days.length > 1 ? `Day ${dayIndex + 1} — ${pick(day.title)}` : pick(day.title)}>
          <ol className="flex flex-col gap-4">
            {day.stops.map((stop, i) => {
              const place = stop.placeId ? placeById.get(stop.placeId) : undefined;
              return (
                <li key={i} className="flex gap-4">
                  <span className="w-14 shrink-0 font-data text-ink">{stop.time || "—"}</span>
                  <div>
                    <p className="font-medium text-ink">
                      {place ? (
                        <Link href={`/tourism/${place.id}`} className="text-river-current hover:underline">
                          {pick(stop.title)}
                        </Link>
                      ) : (
                        pick(stop.title)
                      )}
                    </p>
                    {pick(stop.description) && <p className="mt-0.5">{pick(stop.description)}</p>}
                    {stop.durationMinutes ? <p className="mt-0.5 text-xs">~{formatDuration(stop.durationMinutes)}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>
      ))}

      {pick(itinerary.tips) && (
        <Section title="Travel tips">
          <p className="text-ink">{pick(itinerary.tips)}</p>
        </Section>
      )}
      <p className="text-xs text-ink-muted">Timings are suggestions. Check temple and boat timings before you go.</p>
    </DetailShell>
  );
}
