import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { DetailShell, Section, Facts, BadgeList, catalogMetadata, pick } from "@/components/catalog/DetailShell";
import { DirectionsButton } from "@/components/catalog/DirectionsButton";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { LeadForm } from "@/components/marketplace/LeadForm";
import { loadPublic } from "@/features/catalog/publicApi";
import type { Boat, BoatOperator, BoatRoute } from "@/features/boats/definition";
import { BOAT_TYPE_LABELS, BOAT_STATUS_LABELS } from "@/features/boats/definition";
import { WEEKDAY_OPTIONS } from "@/features/catalog/common";
import { formatDuration, formatInr, formatRelativeTime, isStale } from "@/lib/catalog/format";
import { MANUAL_STATUS_STALE_HOURS } from "@/config/app";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ routeId: string }> };

const DAY_LABEL = Object.fromEntries(WEEKDAY_OPTIONS.map((d) => [d.value, d.label.slice(0, 3)]));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { routeId } = await params;
  const r = await loadPublic<BoatRoute>("boat-routes", routeId);
  return catalogMetadata(r, r ? pick(r.title) : "", r ? pick(r.description) : "");
}

export default async function BoatRoutePage({ params }: Props) {
  const { routeId } = await params;
  const route = await loadPublic<BoatRoute>("boat-routes", routeId);
  if (!route) notFound();

  const [operator, boat] = await Promise.all([
    loadPublic<BoatOperator>("boat-operators", route.operatorId),
    route.boatId ? loadPublic<Boat>("boats", route.boatId) : Promise.resolve(null),
  ]);
  const boatStatusUpdated = boat ? (boat as unknown as { statusUpdatedAt?: string }).statusUpdatedAt : undefined;

  return (
    <DetailShell
      crumbs={[{ label: "Boats", href: "/boats" }, { label: pick(route.title) }]}
      title={pick(route.title)}
      subtitle={`From ${route.startPointName}${route.endPointName ? ` to ${route.endPointName}` : ""}`}
      badges={route.active ? [] : [{ label: "Not currently operating", tone: "neutral" }]}
      images={route.images}
    >
      <p className="text-ink-muted">{pick(route.description)}</p>

      <Section title="Trip details">
        <Facts
          rows={[
            ["Duration", formatDuration(route.durationMinutes)],
            ["Adult price", route.adultPriceInr === undefined ? "Price on request" : formatInr(route.adultPriceInr)],
            ["Child price", route.childPriceInr === undefined ? undefined : formatInr(route.childPriceInr)],
            ["Minimum age", route.minimumAge === undefined ? undefined : `${route.minimumAge} years`],
            ["Pricing note", pick(route.pricingNote)],
          ]}
        />
        <p className="mt-3 text-xs">Prices are indicative and set by the operator.</p>
      </Section>

      <Section title="Schedule">
        {route.schedules.length === 0 ? (
          <p>No fixed schedule published — send an inquiry to ask about departure times.</p>
        ) : (
          <ul className="divide-y divide-border">
            {route.schedules.map((s, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="text-ink">
                  {s.days.map((d) => DAY_LABEL[d] ?? d).join(", ")}
                  {s.notes ? <span className="text-ink-muted"> · {s.notes}</span> : null}
                </span>
                <span className="font-data text-ink">{s.departureTime}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs">Schedules are entered by our team and can change with weather and river conditions.</p>
      </Section>

      <Section title="Safety information">
        <p className="text-ink">{pick(route.safetyInfo)}</p>
        {pick(route.weatherNote) && <p className="mt-2">{pick(route.weatherNote)}</p>}
      </Section>

      {operator ? (
        <Section title="Operator">
          <Link href={`/boats/operators/${operator.id}`} className="font-medium text-river-current hover:underline">
            {pick(operator.name)}
          </Link>
          {operator.licenceNote && <p className="mt-1">Licence / permit: {operator.licenceNote}</p>}
        </Section>
      ) : (
        <Section title="Operator">
          <p>Operator details are currently unavailable.</p>
        </Section>
      )}

      {boat && (
        <Section title="Boat">
          <Facts
            rows={[
              ["Boat", pick(boat.name)],
              ["Type", BOAT_TYPE_LABELS[boat.boatType]],
              ["Capacity", `${boat.capacity} passengers`],
              ["Life jackets", boat.lifeJacketsProvided ? "Provided for all passengers" : "Not confirmed — ask the operator"],
              ["Service status", `${BOAT_STATUS_LABELS[boat.status]}${boatStatusUpdated ? ` (set ${formatRelativeTime(boatStatusUpdated)}${isStale(boatStatusUpdated, MANUAL_STATUS_STALE_HOURS) ? " — may be outdated" : ""})` : ""}`],
            ]}
          />
          <div className="mt-3">
            <BadgeList items={boat.safetyFeatures} empty="No safety features listed" />
          </div>
        </Section>
      )}

      <div>
        <MapEmbed location={route.startLocation} label={route.startPointName} />
        <div className="mt-3">
          <DirectionsButton location={route.startLocation} label="Directions to boarding point" />
        </div>
      </div>

      <div className="max-w-md">
        <LeadForm providerId={route.id} providerType="boat_route" recipientLabel="our team" />
      </div>
    </DetailShell>
  );
}
