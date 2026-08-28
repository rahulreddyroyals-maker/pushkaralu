import { EventForm } from "@/features/events/components/EventForm";

export default function NewEventPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">New event</h1>
      <EventForm />
    </div>
  );
}
