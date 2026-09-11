import { SiteShell } from "@/components/layout/SiteShell";
import { listBusinesses } from "@/features/businesses/api";
import { BusinessListClient } from "@/features/businesses/components/BusinessListClient";
import { Breadcrumb } from "@/components/ui";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  const initial = await listBusinesses({ pageSize: 12, category: "restaurant" });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Restaurants" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-ink">Restaurants</h1>
        <p className="mt-1 text-ink-muted">Vegetarian and family-friendly dining near the ghats.</p>
        <div className="mt-8">
          <BusinessListClient category="restaurant" initial={initial} />
        </div>
      </div>
    </SiteShell>
  );
}
