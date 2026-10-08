import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, EmptyState } from "@/components/ui";
import { AcknowledgeAlertButton } from "@/components/admin/AcknowledgeAlertButton";
import { getActor } from "@/lib/serviceHttp";
import { listCatalog } from "@/lib/catalog/server/repository";
import { requireCatalogDefinition } from "@/features/catalog/registry";
import { EMERGENCY_KINDS, EMERGENCY_KIND_LABELS } from "@/features/emergency/definition";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { moderationQueue } from "@/features/lostFound/service";
import { familyDeps } from "@/features/family/deps";
import { listEscalatedAlerts } from "@/features/family/service";
import { SAFETY_LIMITS } from "@/config/app";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

export default async function AdminEmergencyPage() {
  const actor = await getActor();
  if (!actor) redirect("/login?redirect=/admin/emergency");

  const def = requireCatalogDefinition("emergency-services");
  const [{ items: records }, pending, alerts] = await Promise.all([
    listCatalog(def, { pageSize: 200, includeUnpublished: true }),
    moderationQueue(lostFoundDeps, actor, "PENDING"),
    listEscalatedAlerts(familyDeps, actor),
  ]);

  const now = Date.now();
  const isStale = (r: Record<string, unknown>) => {
    const t = Date.parse(String(r.verifiedOn ?? ""));
    return Number.isNaN(t) || now - t > SAFETY_LIMITS.emergencyReverifyDays * DAY_MS;
  };
  const rows = EMERGENCY_KINDS.map((kind) => {
    const of = records.filter((r) => r.kind === kind);
    return {
      kind,
      published: of.filter((r) => r.published).length,
      draft: of.filter((r) => !r.published).length,
      stale: of.filter((r) => r.published && isStale(r)).length,
    };
  });
  const staffOk = pending.ok && alerts.ok;
  const unacked = alerts.ok ? alerts.data.items.filter((a) => !a.acknowledgedBy) : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Emergency &amp; safety</h1>
        <p className="text-sm text-ink-muted">
          Only verified entries are shown to the public. Entries not re-verified within {SAFETY_LIMITS.emergencyReverifyDays} days are flagged on public pages.
        </p>
      </div>

      <section aria-labelledby="dir">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="dir" className="text-lg font-semibold text-ink">Emergency directory</h2>
          <Link href="/admin/emergency-services" className="text-sm font-medium text-river-deep underline">Manage entries</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.kind} className="p-4">
              <p className="font-medium text-ink">{EMERGENCY_KIND_LABELS[r.kind]}</p>
              <p className="mt-1 text-sm text-ink-muted">{r.published} published · {r.draft} draft</p>
              {r.published === 0 && <Badge tone="warning">Nothing published — public page shows an empty state</Badge>}
              {r.stale > 0 && <Badge tone="warning">{r.stale} need re-verification</Badge>}
            </Card>
          ))}
        </div>
      </section>

      {!staffOk ? (
        <EmptyState title="Moderator access required" description="Your role can't review Lost & Found reports or family alerts." />
      ) : (
        <>
          <section aria-labelledby="lf">
            <h2 id="lf" className="mb-3 text-lg font-semibold text-ink">Lost &amp; Found awaiting review</h2>
            <Card className="flex items-center justify-between p-4">
              <p className="text-sm text-ink">{pending.ok ? pending.data.items.length : 0} pending report(s)</p>
              <Link href="/admin/lost-and-found" className="text-sm font-medium text-river-deep underline">Open moderation queue</Link>
            </Card>
          </section>

          <section aria-labelledby="fa">
            <h2 id="fa" className="mb-3 text-lg font-semibold text-ink">Family alerts sent to staff</h2>
            <p className="mb-3 text-sm text-ink-muted">Shown only when the sender chose to notify staff. You see the alert and callback number — never the group or anyone&apos;s ongoing location.</p>
            {alerts.ok && alerts.data.items.length === 0 && <EmptyState title="No escalated alerts" description="Nothing needs attention." />}
            <div className="flex flex-col gap-3">
              {alerts.ok &&
                alerts.data.items.map((a) => (
                  <Card key={a.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="text-sm">
                      <p className="font-medium text-ink">{a.senderName} <span className="text-ink-muted">· {new Date(a.createdAt).toLocaleString()}</span></p>
                      <p className="text-ink">{a.message || "No message"}</p>
                      {a.callbackPhone && <p>Call back: <a className="font-medium text-river-deep underline" href={`tel:${a.callbackPhone.replace(/[^\d+]/g, "")}`}>{a.callbackPhone}</a></p>}
                      {a.location && <a className="text-river-deep underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${a.location.latitude},${a.location.longitude}`}>Navigate to attached location</a>}
                    </div>
                    {a.acknowledgedBy ? <Badge tone="success">Acknowledged</Badge> : <AcknowledgeAlertButton id={a.id} />}
                  </Card>
                ))}
            </div>
            {unacked.length > 0 && <p className="mt-2 text-xs text-ink-muted">{unacked.length} unacknowledged</p>}
          </section>
        </>
      )}
    </div>
  );
}
