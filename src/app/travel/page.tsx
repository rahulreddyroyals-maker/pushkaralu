import { SiteShell } from "@/components/layout/SiteShell";
import { listBusinesses } from "@/features/businesses/api";
import { BusinessListClient } from "@/features/businesses/components/BusinessListClient";
import { Breadcrumb } from "@/components/ui";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

const CATEGORIES = ["taxi", "travel_operator"] as const;

/** Combines taxi + travel_operator categories under one public page — see spec's "Travel" nav entry (ROUTE_MAP.md). */
export default async function TravelPage() {
  const initial = await listBusinesses({ pageSize: 12, category: [...CATEGORIES] });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Travel" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-ink">Travel & Taxis</h1>
        <p className="mt-1 text-ink-muted">Taxis and travel operators serving the pilgrimage route.</p>
        <div className="mt-8">
          <BusinessListClient category={[...CATEGORIES]} initial={initial} />
        </div>
      </div>
    </SiteShell>
  );
}
