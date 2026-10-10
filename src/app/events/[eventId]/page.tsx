import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { getEvent, listAnnouncements } from "@/features/events/api";
import { Breadcrumb, Badge, Card } from "@/components/ui";
import { FollowButton } from "@/components/notifications/FollowButton";
import { ROUTES } from "@/config/app";
import { buildMetadata } from "@/lib/seo/metadata";
import { eventSlug, hubPath } from "@/features/seoHub/hub";

// force-dynamic — see src/app/events/page.tsx for why (build-time Admin SDK credential requirement).
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) return {};
  // The SEO hub page is the canonical home for this event; this app page points search engines there to avoid duplicates.
  return buildMetadata({
    title: event.seo?.title?.en ?? event.name.en,
    description: event.seo?.description?.en ?? event.description.en,
    path: hubPath(eventSlug(event)),
    image: event.featuredImage,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

export default async function EventDetailPage({ params }: PageProps) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const { items: announcements } = await listAnnouncements(eventId, { pageSize: 10 });

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Events", href: "/events" }, { label: event.name.en }]} />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-ink">{event.name.en}</h1>
          <Badge tone={event.status === "ACTIVE" ? "success" : "info"}>{event.status}</Badge>
        </div>
        <p className="mt-2 font-data text-sm text-ink-muted">
          {formatDate(event.startDate)} – {formatDate(event.endDate)} · {event.river}
        </p>

        <div className="mt-4">
          <FollowButton kind="event" id={event.id} label="Get reminders for this event" />
        </div>

        <p className="mt-6 text-ink-muted">{event.description.en}</p>

        <div className="mt-8">
          <Link
            href={`/events/${event.id}/ghats`}
            className="inline-flex items-center gap-2 rounded-lg bg-river-deep px-5 py-3 text-sm font-medium text-white hover:bg-[#0b3e4b]"
          >
            Browse ghats for this event →
          </Link>
        </div>

        {announcements.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-ink">Announcements</h2>
            <div className="mt-4 flex flex-col gap-3">
              {announcements.map((a) => (
                <Card key={a.id} padding="md">
                  <p className="font-semibold text-ink">{a.title.en}</p>
                  <p className="mt-1 text-sm text-ink-muted">{a.body.en}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
