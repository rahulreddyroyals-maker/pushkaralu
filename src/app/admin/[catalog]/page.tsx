import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { EntityActions } from "@/components/admin/EntityActions";
import { getCatalogDefinition } from "@/features/catalog/registry";
import { listCatalog } from "@/lib/catalog/server/repository";
import { pick, formatRelativeTime } from "@/lib/catalog/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminCatalogListPage({
  params,
  searchParams,
}: {
  params: Promise<{ catalog: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { catalog } = await params;
  const { cursor } = await searchParams;
  const def = getCatalogDefinition(catalog);
  if (!def) notFound();

  const { items, nextCursor } = await listCatalog(def, { pageSize: PAGE_SIZE, cursor, includeUnpublished: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{def.labelPlural}</h1>
          <p className="text-sm text-ink-muted">Admin-managed. New records are saved as drafts until published.</p>
        </div>
        <Link href={`/admin/${def.key}/new`}>
          <Button>New {def.label.toLowerCase()}</Button>
        </Link>
      </div>

      {items.length === 0 && <EmptyState title={`No ${def.labelPlural.toLowerCase()} yet`} description={`Add the first ${def.label.toLowerCase()}.`} />}

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const statusUpdated = formatRelativeTime(item.statusUpdatedAt as string | undefined);
          return (
            <Card key={item.id} padding="md" className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/${def.key}/${item.id}/edit`} className="font-semibold text-ink hover:underline">
                    {pick(item[def.titleField] as { en?: string })}
                  </Link>
                  <Badge tone={item.published ? "success" : "neutral"}>{item.published ? "Published" : "Draft"}</Badge>
                  {typeof item.status === "string" && <Badge tone="info">{item.status}</Badge>}
                  {typeof item.kind === "string" && <Badge tone="neutral">{item.kind}</Badge>}
                </div>
                {statusUpdated && <p className="mt-1 text-xs text-ink-muted">Status updated {statusUpdated}</p>}
              </div>
              <EntityActions
                published={item.published}
                publishUrl={`/api/admin/catalog/${def.key}/${item.id}/publish-state`}
                deleteUrl={`/api/admin/catalog/${def.key}/${item.id}`}
                entityLabel={def.label.toLowerCase()}
              />
            </Card>
          );
        })}
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Link href={`/admin/${def.key}?cursor=${encodeURIComponent(nextCursor)}`}>
            <Button variant="outline">Next page</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
