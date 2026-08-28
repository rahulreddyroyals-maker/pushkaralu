import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent } from "@/features/events/api";
import { listGhats } from "@/features/ghats/api";
import { Card, Badge, Button, Breadcrumb, EmptyState, CrowdStatusBadge } from "@/components/ui";
import { EntityActions } from "@/components/admin/EntityActions";

export default async function AdminGhatsForEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const event = await getEvent(eventId, { includeUnpublished: true });
  if (!event) notFound();

  const { items } = await listGhats(eventId, { pageSize: 100, includeUnpublished: true });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Ghats", href: "/admin/ghats" }, { label: event.name.en }]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Ghats — {event.name.en}</h1>
          <p className="text-sm text-ink-muted">Manage ghats, facilities, and crowd status for this event.</p>
        </div>
        <Link href={`/admin/events/${eventId}/ghats/new`}>
          <Button>New ghat</Button>
        </Link>
      </div>

      {items.length === 0 && <EmptyState title="No ghats yet" description="Add the first ghat for this event." />}

      <div className="flex flex-col gap-3">
        {items.map((ghat) => (
          <Card key={ghat.id} padding="md" className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/events/${eventId}/ghats/${ghat.id}/edit`} className="font-semibold text-ink hover:underline">
                  {ghat.name.en}
                </Link>
                <Badge tone={ghat.published ? "success" : "neutral"}>{ghat.published ? "Published" : "Draft"}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{ghat.facilities.length} facilities</p>
            </div>
            <div className="flex items-center gap-4">
              <CrowdStatusBadge status={ghat.crowdStatus} updatedAt={ghat.crowdStatusUpdatedAt} />
              <EntityActions
                published={ghat.published}
                publishUrl={`/api/admin/events/${eventId}/ghats/${ghat.id}/publish-state`}
                deleteUrl={`/api/admin/events/${eventId}/ghats/${ghat.id}`}
                entityLabel="ghat"
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
