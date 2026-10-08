import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, EmptyState } from "@/components/ui";
import { ModerationPanel } from "@/components/lostFound/ModerationPanel";
import { getActor } from "@/lib/serviceHttp";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { moderationQueue } from "@/features/lostFound/service";
import { REPORT_STATUSES, type ReportStatus } from "@/features/lostFound/types";

export const dynamic = "force-dynamic";

export default async function AdminLostFoundPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const active: ReportStatus = (REPORT_STATUSES as readonly string[]).includes(status ?? "") ? (status as ReportStatus) : "PENDING";
  const actor = await getActor();
  if (!actor) redirect("/login?redirect=/admin/lost-and-found");

  const result = await moderationQueue(lostFoundDeps, actor, active);
  if (!result.ok) {
    // EDITORs can open /admin but may not moderate (canModerateContent) — say so rather than render an empty queue.
    return <EmptyState title="Moderator access required" description="Your role can't review Lost & Found reports." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Lost &amp; Found moderation</h1>
        <p className="text-sm text-ink-muted">Urgent reports about people are listed first, then oldest first. Nothing is public until you write and approve the public text.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {REPORT_STATUSES.map((s) => (
          <Link key={s} href={`/admin/lost-and-found?status=${s}`}>
            <Badge tone={active === s ? "info" : "neutral"}>{s}</Badge>
          </Link>
        ))}
      </div>
      {result.data.items.length === 0 && <EmptyState title={`No ${active.toLowerCase()} reports`} description="Nothing to review here." />}
      <div className="flex flex-col gap-4">
        {result.data.items.map((r) => (
          <ModerationPanel key={r.id} report={r} />
        ))}
      </div>
    </div>
  );
}
