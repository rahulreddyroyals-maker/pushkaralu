import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { SiteShell } from "@/components/layout/SiteShell";
import { getEvent } from "@/features/events/api";
import { getGhat } from "@/features/ghats/api";
import { Breadcrumb, Card, Badge } from "@/components/ui";
import { FollowButton } from "@/components/notifications/FollowButton";
import { CrowdStatusBadge } from "@/components/ui/CrowdStatusBadge";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { GHAT_FACILITY_LABELS } from "@/features/ghats/types";
import { ROUTES } from "@/config/app";

// force-dynamic — see src/app/events/page.tsx for rationale.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ eventId: string; ghatId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId, ghatId } = await params;
  const ghat = await getGhat(eventId, ghatId);
  if (!ghat) return {};
  return { title: ghat.seo?.title?.en ?? ghat.name.en, description: ghat.seo?.description?.en ?? ghat.description.en };
}

export default async function GhatDetailPage({ params }: PageProps) {
  const { eventId, ghatId } = await params;
  const [event, ghat] = await Promise.all([getEvent(eventId), getGhat(eventId, ghatId)]);
  if (!event || !ghat) notFound();
  // Staff-suggested alternative: only shown if it still exists and is published.
  const alternative = ghat.alternativeGhatId ? await getGhat(eventId, ghat.alternativeGhatId) : null;

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: "Home", href: ROUTES.home },
            { label: event.name.en, href: `/events/${eventId}` },
            { label: "Ghats", href: `/events/${eventId}/ghats` },
            { label: ghat.name.en },
          ]}
        />

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-ink">{ghat.name.en}</h1>
          <CrowdStatusBadge detailed status={ghat.crowdStatus} updatedAt={ghat.crowdStatusUpdatedAt} reportedBy={ghat.crowdStatusUpdatedBy} waitMinutes={ghat.waitMinutes} operationalStatus={ghat.operationalStatus} note={ghat.statusNote} />
        </div>

        {alternative && (
          <div className="mt-4 rounded-lg border border-border bg-river-mist p-4 text-sm">
            Staff suggest an alternative:{" "}
            <a className="font-medium text-river-deep underline" href={`/events/${eventId}/ghats/${alternative.id}`}>
              {alternative.name.en}
            </a>
          </div>
        )}

        <div className="mt-4">
          <FollowButton kind="ghat" id={ghat.id} label="Get crowd alerts for this ghat" />
        </div>

        <p className="mt-4 text-ink-muted">{ghat.description.en}</p>

        {ghat.images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ghat.images.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-river-mist">
                <Image src={src} alt={`${ghat.name.en} photo ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card padding="md">
            <h2 className="font-semibold text-ink">Facilities</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {ghat.facilities.length === 0 && <span className="text-sm text-ink-muted">Not specified</span>}
              {ghat.facilities.map((f) => (
                <Badge key={f} tone="info">
                  {GHAT_FACILITY_LABELS[f as keyof typeof GHAT_FACILITY_LABELS] ?? f}
                </Badge>
              ))}
            </div>
          </Card>
          <Card padding="md">
            <h2 className="font-semibold text-ink">Parking</h2>
            <p className="mt-2 text-sm text-ink-muted">{ghat.parkingInfo?.en || "Not specified"}</p>
          </Card>
          <Card padding="md">
            <h2 className="font-semibold text-ink">Medical facilities</h2>
            <p className="mt-2 text-sm text-ink-muted">{ghat.medicalInfo?.en || "Not specified"}</p>
          </Card>
          <Card padding="md">
            <h2 className="font-semibold text-ink">Location</h2>
            <p className="mt-2 font-data text-sm text-ink-muted">
              {ghat.location.latitude.toFixed(5)}, {ghat.location.longitude.toFixed(5)}
            </p>
          </Card>
        </div>

        <div className="mt-6">
          <MapEmbed location={ghat.location} label={ghat.name.en} />
        </div>
      </div>
    </SiteShell>
  );
}
