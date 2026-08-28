import Link from "next/link";
import { listTemples } from "@/features/temples/api";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { EntityActions } from "@/components/admin/EntityActions";

export default async function AdminTemplesPage() {
  const { items } = await listTemples({ pageSize: 100, includeUnpublished: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Temples</h1>
          <p className="text-sm text-ink-muted">Manage the temple directory.</p>
        </div>
        <Link href="/admin/temples/new">
          <Button>New temple</Button>
        </Link>
      </div>

      {items.length === 0 && <EmptyState title="No temples yet" description="Add the first temple to the directory." />}

      <div className="flex flex-col gap-3">
        {items.map((temple) => (
          <Card key={temple.id} padding="md" className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/temples/${temple.id}/edit`} className="font-semibold text-ink hover:underline">
                  {temple.name.en}
                </Link>
                <Badge tone={temple.published ? "success" : "neutral"}>{temple.published ? "Published" : "Draft"}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{temple.address}</p>
            </div>
            <EntityActions
              published={temple.published}
              publishUrl={`/api/admin/temples/${temple.id}/publish-state`}
              deleteUrl={`/api/admin/temples/${temple.id}`}
              entityLabel="temple"
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
