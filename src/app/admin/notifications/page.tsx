import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { getActor } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { listCampaigns } from "@/features/notifications/service";
import { CATEGORY_LABELS, type CampaignStatus } from "@/features/notifications/types";

export const dynamic = "force-dynamic";

const TONE: Record<CampaignStatus, "info" | "warning" | "success" | "neutral" | "danger"> = { SCHEDULED: "info", SENDING: "warning", SENT: "success", CANCELLED: "neutral", FAILED: "danger" };

export default async function AdminNotificationsPage() {
  const actor = await getActor();
  if (!actor) redirect("/login?redirect=/admin/notifications");
  const result = await listCampaigns(notificationDeps, actor);
  if (!result.ok) return <EmptyState title="Moderator access required" description="Your role can't manage notifications." />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Notifications</h1>
          <p className="text-sm text-ink-muted">Compose alerts and reminders, and see how many people each one reached.</p>
        </div>
        <Link href="/admin/notifications/new">
          <Button>New notification</Button>
        </Link>
      </div>
      {result.data.items.length === 0 && <EmptyState title="Nothing sent yet" description="Notifications you send or schedule will be listed here." />}
      <div className="flex flex-col gap-3">
        {result.data.items.map((c) => (
          <Link key={c.id} href={`/admin/notifications/${c.id}`}>
            <Card hoverable padding="md" className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink">{c.title}</p>
                <p className="text-xs text-ink-muted">
                  {CATEGORY_LABELS[c.category]} · {c.priority.toLowerCase()} · {c.source === "ADMIN" ? `by ${c.createdByName}` : "automatic"} · {new Date(c.scheduledFor).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-muted">
                <span>{c.stats.inApp} in inbox</span>
                <span>{c.stats.pushSent} pushed</span>
                <Badge tone={TONE[c.status]}>{c.status}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
