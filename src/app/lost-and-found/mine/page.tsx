import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { Badge, Breadcrumb, Card, EmptyState } from "@/components/ui";
import { getActor } from "@/lib/serviceHttp";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { listMine } from "@/features/lostFound/service";
import { LOST_FOUND_CATEGORY_LABELS } from "@/features/lostFound/types";
import { formatRelativeTime } from "@/lib/catalog/format";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

const STATUS_TONE = { PENDING: "warning", APPROVED: "success", REJECTED: "danger", RESOLVED: "neutral" } as const;

export default async function MyReportsPage() {
  const actor = await getActor();
  if (!actor) redirect("/login?redirect=/lost-and-found/mine");
  const result = await listMine(lostFoundDeps, actor);
  const items = result.ok ? result.data.items : [];

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Lost & Found", href: ROUTES.lostAndFound }, { label: "My reports" }]} />
        <h1 className="mt-3 mb-6 text-2xl font-semibold text-ink">My reports</h1>
        {items.length === 0 && <EmptyState title="No reports yet" description="Reports you submit appear here, with their review status." />}
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <Link key={r.id} href={`/lost-and-found/${r.id}`}>
              <Card hoverable padding="md" className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  <Badge tone="neutral">{LOST_FOUND_CATEGORY_LABELS[r.category]}</Badge>
                  <span className="text-xs text-ink-muted">{formatRelativeTime(r.createdAt)}</span>
                </div>
                <p className="font-semibold text-ink">{r.title}</p>
                {r.status === "REJECTED" && r.rejectionReason && <p className="text-sm text-status-critical">Reason: {r.rejectionReason}</p>}
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
