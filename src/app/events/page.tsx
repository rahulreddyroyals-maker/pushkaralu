import { SiteShell } from "@/components/layout/SiteShell";
import { listEvents } from "@/features/events/api";
import { LocationCard, EmptyState, Breadcrumb } from "@/components/ui";
import { ROUTES } from "@/config/app";

// force-dynamic, not ISR: this reads via the Admin SDK, which needs live
// Firebase credentials at BUILD time for any static/ISR prerendering.
// Forcing dynamic rendering defers the data fetch to request time instead,
// so `next build` never needs Firebase credentials — only the deployed
// runtime does. Revisit with generateStaticParams + ISR once deployed
// against a real project where build-time credentials are available.
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const { items } = await listEvents({ pageSize: 24 });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Events" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-ink">Pushkaralu Events</h1>
        <p className="mt-1 text-ink-muted">Upcoming and past Pushkaralu events across rivers and years.</p>

        {items.length === 0 && (
          <div className="mt-8">
            <EmptyState title="No events published yet" description="Check back soon for upcoming Pushkaralu events." />
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((event) => (
              <LocationCard
                key={event.id}
                href={`/events/${event.id}`}
                image={event.featuredImage}
                title={event.name.en}
                subtitle={`${event.river} · ${event.year}`}
                meta={new Date(event.startDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                badge={{ label: event.status, tone: event.status === "ACTIVE" ? "success" : "info" }}
              />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
