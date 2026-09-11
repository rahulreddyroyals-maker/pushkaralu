import { SiteShell } from "@/components/layout/SiteShell";
import { listHotels } from "@/features/hotels/api";
import { HotelListClient } from "@/features/hotels/components/HotelListClient";
import { Breadcrumb } from "@/components/ui";
import { ROUTES } from "@/config/app";

// force-dynamic — reads via the Admin SDK, which needs live credentials
// at BUILD time for any static/ISR prerendering. See docs/ROUTE_MAP.md
// (Sprint 3's "Rendering strategy" note) for the full rationale — same
// reasoning applies to every provider-marketplace page in this sprint.
export const dynamic = "force-dynamic";

export default async function HotelsPage() {
  const initial = await listHotels({ pageSize: 12 });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Hotels" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-ink">Hotels</h1>
        <p className="mt-1 text-ink-muted">Stay near the ghats — amenities, pricing, and location.</p>

        <div className="mt-8">
          <HotelListClient initial={initial} />
        </div>
      </div>
    </SiteShell>
  );
}
