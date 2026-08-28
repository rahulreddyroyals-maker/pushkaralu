import Link from "next/link";
import { listEvents } from "@/features/events/api";
import { Card, Badge, EmptyState } from "@/components/ui";

/** Ghats belong to a specific event (see docs/DATABASE_SCHEMA.md), so admin management starts by picking which event's ghats to manage. */
export default async function AdminGhatsLandingPage() {
  const { items } = await listEvents({ pageSize: 50, includeUnpublished: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Ghats</h1>
        <p className="text-sm text-ink-muted">Select an event to manage its ghats.</p>
      </div>

      {items.length === 0 && (
        <EmptyState title="No events yet" description="Create an event first — ghats belong to a specific event." />
      )}

      <div className="flex flex-col gap-3">
        {items.map((event) => (
          <Link key={event.id} href={`/admin/events/${event.id}/ghats`}>
            <Card padding="md" hoverable className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-ink">{event.name.en}</p>
                <p className="text-sm text-ink-muted">{event.river} · {event.year}</p>
              </div>
              <Badge tone={event.published ? "success" : "neutral"}>{event.published ? "Published" : "Draft"}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
