import { notFound } from "next/navigation";
import { getEvent } from "@/features/events/api";
import { getGhat, listGhats } from "@/features/ghats/api";
import { GhatForm } from "@/features/ghats/components/GhatForm";
import { CrowdStatusControl } from "@/features/ghats/components/CrowdStatusControl";
import { Breadcrumb } from "@/components/ui";

export default async function EditGhatPage({ params }: { params: Promise<{ id: string; ghatId: string }> }) {
  const { id: eventId, ghatId } = await params;
  const [event, ghat] = await Promise.all([
    getEvent(eventId, { includeUnpublished: true }),
    getGhat(eventId, ghatId, { includeUnpublished: true }),
  ]);
  if (!event || !ghat) notFound();
  const others = (await listGhats(eventId, { pageSize: 50 })).items.filter((g) => g.id !== ghatId);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Ghats", href: "/admin/ghats" },
          { label: event.name.en, href: `/admin/events/${eventId}/ghats` },
          { label: ghat.name.en },
        ]}
      />
      <h1 className="text-2xl font-semibold text-ink">Edit ghat</h1>
      <CrowdStatusControl
        eventId={eventId}
        ghatId={ghatId}
        currentStatus={ghat.crowdStatus}
        updatedAt={ghat.crowdStatusUpdatedAt}
        reportedBy={ghat.crowdStatusUpdatedBy}
        waitMinutes={ghat.waitMinutes}
        operationalStatus={ghat.operationalStatus}
        alternativeGhatId={ghat.alternativeGhatId}
        statusNote={ghat.statusNote}
        alternatives={others.map((g) => ({ id: g.id, name: g.name.en }))}
      />
      <GhatForm eventId={eventId} initial={ghat} />
    </div>
  );
}
