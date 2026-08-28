import { notFound } from "next/navigation";
import { getEvent } from "@/features/events/api";
import { EventForm } from "@/features/events/components/EventForm";
import { AnnouncementsPanel } from "@/features/events/components/AnnouncementsPanel";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id, { includeUnpublished: true });
  if (!event) notFound();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-ink">Edit event</h1>
      <EventForm initial={event} />
      <AnnouncementsPanel eventId={id} />
    </div>
  );
}
