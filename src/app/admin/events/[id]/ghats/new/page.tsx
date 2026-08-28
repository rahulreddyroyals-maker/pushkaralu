import { notFound } from "next/navigation";
import { getEvent } from "@/features/events/api";
import { GhatForm } from "@/features/ghats/components/GhatForm";
import { Breadcrumb } from "@/components/ui";

export default async function NewGhatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const event = await getEvent(eventId, { includeUnpublished: true });
  if (!event) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Ghats", href: "/admin/ghats" },
          { label: event.name.en, href: `/admin/events/${eventId}/ghats` },
          { label: "New" },
        ]}
      />
      <h1 className="text-2xl font-semibold text-ink">New ghat — {event.name.en}</h1>
      <GhatForm eventId={eventId} />
    </div>
  );
}
