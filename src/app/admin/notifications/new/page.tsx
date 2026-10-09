import { redirect } from "next/navigation";
import { Breadcrumb, EmptyState } from "@/components/ui";
import { ComposerForm, type EventOption } from "@/components/notifications/ComposerForm";
import { getActor } from "@/lib/serviceHttp";
import { canViewCampaigns } from "@/features/notifications/policy";
import { listEvents } from "@/features/events/api";
import { listGhats } from "@/features/ghats/api";

export const dynamic = "force-dynamic";

export default async function NewNotificationPage() {
  const actor = await getActor();
  if (!actor) redirect("/login?redirect=/admin/notifications/new");
  if (!canViewCampaigns(actor.role)) return <EmptyState title="Moderator access required" description="Your role can't send notifications." />;

  const events = (await listEvents({ pageSize: 50, includeUnpublished: false })).items;
  const options: EventOption[] = await Promise.all(
    events.map(async (e) => ({ id: e.id, name: e.name.en, ghats: (await listGhats(e.id, { pageSize: 50 })).items.map((g) => ({ id: g.id, name: g.name.en })) }))
  );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Notifications", href: "/admin/notifications" }, { label: "New" }]} />
      <h1 className="text-2xl font-semibold text-ink">New notification</h1>
      <ComposerForm role={actor.role} events={options} />
    </div>
  );
}
