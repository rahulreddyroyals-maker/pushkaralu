import Link from "next/link";
import { listEvents } from "@/features/events/api";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { EntityActions } from "@/components/admin/EntityActions";

export default async function AdminEventsPage() {
  const { items } = await listEvents({ pageSize: 50, includeUnpublished: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Events</h1>
          <p className="text-sm text-ink-muted">Create and manage Pushkaralu events.</p>
        </div>
        <Link href="/admin/events/new">
          <Button>New event</Button>
        </Link>
      </div>

      {items.length === 0 && (
        <EmptyState title="No events yet" description="Create your first Pushkaralu event using the button above." />
      )}

      <div className="flex flex-col gap-3">
        {items.map((event) => (
          <Card key={event.id} padding="md" className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/events/${event.id}/edit`} className="font-semibold text-ink hover:underline">
                  {event.name.en}
                </Link>
                <Badge tone={event.published ? "success" : "neutral"}>{event.published ? "Published" : "Draft"}</Badge>
                <Badge tone="info">{event.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {event.river} · {event.year} · <Link href={`/admin/events/${event.id}/ghats`} className="text-river-current hover:underline">Manage ghats</Link>
              </p>
            </div>
            <EntityActions
              published={event.published}
              publishUrl={`/api/admin/events/${event.id}/publish-state`}
              deleteUrl={`/api/admin/events/${event.id}`}
              entityLabel="event"
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
