import Link from "next/link";
import { listRituals } from "@/features/rituals/api";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { EntityActions } from "@/components/admin/EntityActions";

export default async function AdminRitualsPage() {
  const { items } = await listRituals({ pageSize: 100, includeUnpublished: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Rituals</h1>
          <p className="text-sm text-ink-muted">Manage the ritual catalog purohits can associate with.</p>
        </div>
        <Link href="/admin/rituals/new">
          <Button>New ritual</Button>
        </Link>
      </div>

      {items.length === 0 && <EmptyState title="No rituals yet" description="Add the first ritual to the catalog." />}

      <div className="flex flex-col gap-3">
        {items.map((ritual) => (
          <Card key={ritual.id} padding="md" className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/rituals/${ritual.id}/edit`} className="font-semibold text-ink hover:underline">
                  {ritual.name.en}
                </Link>
                <Badge tone={ritual.published ? "success" : "neutral"}>{ritual.published ? "Published" : "Draft"}</Badge>
              </div>
              <p className="mt-1 font-data text-sm text-ink-muted">
                {ritual.typicalDurationMinutes} min · ₹{ritual.indicativePriceMin}–₹{ritual.indicativePriceMax}
              </p>
            </div>
            <EntityActions
              published={ritual.published}
              publishUrl={`/api/admin/rituals/${ritual.id}/publish-state`}
              deleteUrl={`/api/admin/rituals/${ritual.id}`}
              entityLabel="ritual"
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
