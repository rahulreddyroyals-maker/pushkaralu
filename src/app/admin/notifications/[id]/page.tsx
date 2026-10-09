import { notFound, redirect } from "next/navigation";
import { Badge, Breadcrumb, Card, EmptyState } from "@/components/ui";
import { CancelCampaignButton } from "@/components/notifications/CancelCampaignButton";
import { getActor } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { getCampaignDetail } from "@/features/notifications/service";
import { canSend } from "@/features/notifications/policy";
import { CATEGORY_LABELS } from "@/features/notifications/types";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card padding="md">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="text-sm text-ink">{label}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </Card>
  );
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect(`/login?redirect=/admin/notifications/${id}`);
  const result = await getCampaignDetail(notificationDeps, actor, id);
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <EmptyState title="Moderator access required" description="Your role can't view notifications." />;
  }
  const { campaign: c, readCount } = result.data;
  const s = c.stats;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Notifications", href: "/admin/notifications" }, { label: c.title }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{c.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink">{c.message}</p>
          <p className="mt-2 text-xs text-ink-muted">
            {CATEGORY_LABELS[c.category]} · priority {c.priority.toLowerCase()} · audience {c.audience.type.toLowerCase().replace("_", " ")} · {c.sendPush ? "inbox + push" : "inbox only"} · {c.source === "ADMIN" ? `created by ${c.createdByName}` : "sent automatically"}
          </p>
          <p className="text-xs text-ink-muted">Scheduled for {new Date(c.scheduledFor).toLocaleString()}{c.completedAt ? ` · finished ${new Date(c.completedAt).toLocaleString()}` : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={c.status === "SENT" ? "success" : c.status === "FAILED" ? "danger" : c.status === "CANCELLED" ? "neutral" : "info"}>{c.status}</Badge>
          {(c.status === "SCHEDULED" || c.status === "SENDING") && canSend(actor.role, c.category) && <CancelCampaignButton id={c.id} />}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="People targeted" value={s.targeted} />
        <Stat label="Delivered to inbox" value={s.inApp} />
        <Stat label="Opened in the app" value={readCount} hint="Marked read by the recipient" />
        <Stat label="Skipped by preference" value={s.skippedByPreference} hint="They turned this type off" />
        <Stat label="Push accepted by FCM" value={s.pushSent} hint="FCM confirms it accepted the message; it does not report that a device displayed it." />
        <Stat label="Push failed" value={s.pushFailed} />
        <Stat label="No push device" value={s.noPushToken} hint="Wanted push but haven't enabled it on a device" />
        <Stat label="Push attempted" value={s.pushAttempted} />
      </div>
      {c.lastError && <p className="text-sm text-status-critical">{c.lastError}</p>}
    </div>
  );
}
