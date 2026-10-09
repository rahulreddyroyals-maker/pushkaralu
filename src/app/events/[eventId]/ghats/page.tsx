import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { getEvent } from "@/features/events/api";
import { listGhats } from "@/features/ghats/api";
import { GhatListClient } from "@/features/ghats/components/GhatListClient";
import { Breadcrumb } from "@/components/ui";
import { ROUTES } from "@/config/app";

// force-dynamic — crowd status must always be fresh, and this avoids the build-time Admin SDK credential requirement (see src/app/events/page.tsx).
export const dynamic = "force-dynamic";

export default async function GhatsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const initial = await listGhats(eventId, { pageSize: 12 });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: "Home", href: ROUTES.home },
            { label: "Events", href: "/events" },
            { label: event.name.en, href: `/events/${eventId}` },
            { label: "Ghats" },
          ]}
        />
        <h1 className="mt-3 text-2xl font-semibold text-ink">Ghats — {event.name.en}</h1>
        <p className="mt-1 text-ink-muted">Crowd status reported by event staff (with the time of the last update), facilities, and parking for every ghat.</p>

        <div className="mt-8">
          <GhatListClient eventId={eventId} initial={initial} />
        </div>
      </div>
    </SiteShell>
  );
}
