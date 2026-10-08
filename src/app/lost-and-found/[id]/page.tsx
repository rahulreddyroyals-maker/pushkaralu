import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Badge, Breadcrumb, Card } from "@/components/ui";
import { RespondForm, ResolveButton } from "@/components/lostFound/ReportActions";
import { getActor } from "@/lib/serviceHttp";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { getReport, listResponses } from "@/features/lostFound/service";
import { LOST_FOUND_CATEGORY_LABELS, URGENT_CATEGORIES } from "@/features/lostFound/types";
import { formatRelativeTime } from "@/lib/catalog/format";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

/** Metadata is built from the PUBLIC view only; private reports get no title (and noindex), so a crawler never sees them. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getReport(lostFoundDeps, null, id);
  if (!result.ok || result.data.view !== "public") return { robots: { index: false } };
  return { title: result.data.report.title, description: result.data.report.summary };
}

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params;
  const actor = await getActor();
  const result = await getReport(lostFoundDeps, actor, id);
  if (!result.ok) notFound();
  const data = result.data;

  const isFull = data.view === "full";
  const report = data.report;
  const category = report.category;
  const urgent = URGENT_CATEGORIES.includes(category);
  const responses = isFull && actor ? await listResponses(lostFoundDeps, actor, id) : null;
  const isOwner = isFull && actor?.uid === data.report.reporterId;

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Lost & Found", href: ROUTES.lostAndFound }, { label: isFull ? data.report.title : data.report.title }]} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={report.reportType === "LOST" ? "danger" : "success"}>{report.reportType === "LOST" ? "Lost" : "Found"}</Badge>
          <Badge tone="neutral">{LOST_FOUND_CATEGORY_LABELS[category]}</Badge>
          <Badge tone="info">{report.status}</Badge>
        </div>

        {data.view === "public" ? (
          <>
            <h1 className="mt-3 text-2xl font-bold text-ink">{data.report.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">{data.report.area} · posted {formatRelativeTime(data.report.postedAt)}</p>
            <p className="mt-4 text-ink">{data.report.summary}</p>
            {urgent && (
              <Card padding="md" className="mt-6 border-status-critical/40 bg-[rgba(201,59,59,0.05)]">
                <p className="text-sm text-ink">
                  If you can see this person right now, stay with them if it is safe and <Link className="font-semibold text-status-critical underline" href="/emergency">contact emergency services</Link>.
                </p>
              </Card>
            )}
            <div className="mt-6">
              {data.report.status === "APPROVED" ? <RespondForm reportId={id} signedIn={Boolean(actor)} /> : <p className="text-sm text-ink-muted">This case has been resolved.</p>}
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-bold text-ink">{data.report.title}</h1>
            <p className="mt-1 text-xs text-status-critical">
              {isOwner ? "Only you and moderators can see this page's private details." : "Moderator view — contains private details."}
            </p>
            <Card padding="md" className="mt-4 flex flex-col gap-2 text-sm">
              <p className="whitespace-pre-wrap text-ink">{data.report.description}</p>
              <p className="text-ink-muted">Last seen: {data.report.lastSeenPlace} · {new Date(data.report.lastSeenAt).toLocaleString("en-IN")}</p>
              <p className="font-data text-xs text-ink-muted">Contact on file: {data.report.contactPhone}</p>
              {data.report.status === "REJECTED" && data.report.rejectionReason && <p className="text-status-critical">Not published: {data.report.rejectionReason}</p>}
              {data.report.status === "PENDING" && <p className="text-ink-muted">Waiting for moderator review. Nothing is public yet.</p>}
              {data.report.publicSummary && <p className="border-t border-border pt-2 text-ink-muted">Public text: “{data.report.publicTitle}” — {data.report.publicSummary}</p>}
            </Card>
            {(data.report.status === "PENDING" || data.report.status === "APPROVED") && (
              <div className="mt-4">
                <ResolveButton reportId={id} />
              </div>
            )}
            <h2 className="mt-8 mb-3 font-semibold text-ink">Messages from people who may have found it</h2>
            {responses && responses.ok && responses.data.items.length > 0 ? (
              <div className="flex flex-col gap-3">
                {responses.data.items.map((r) => (
                  <Card key={r.id} padding="md">
                    <p className="text-sm text-ink">{r.message}</p>
                    <p className="mt-1 font-data text-xs text-ink-muted">{r.responderName} · {r.contactPhone} · {formatRelativeTime(r.createdAt)}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No messages yet.</p>
            )}
          </>
        )}
      </div>
    </SiteShell>
  );
}
