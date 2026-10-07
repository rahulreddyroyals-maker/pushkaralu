import { CatalogPageFrame, PageSection } from "@/components/catalog/CatalogPageFrame";
import { CatalogListClient } from "@/components/catalog/CatalogListClient";
import { LocationCard, EmptyState } from "@/components/ui";
import { BusinessListClient } from "@/features/businesses/components/BusinessListClient";
import { listBusinesses } from "@/features/businesses/api";
import { loadPublicList } from "@/features/catalog/publicApi";
import { cardFor, type CatalogItem } from "@/features/catalog/cards";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Boat Rides & River Tourism",
  description: "Boat operators, routes, schedules, durations, prices and safety information.",
};

export default async function BoatsPage() {
  const [routes, operators, businesses] = await Promise.all([
    loadPublicList("boat-routes", { filters: { active: "true" } }),
    loadPublicList("boat-operators", { pageSize: 6 }),
    listBusinesses({ pageSize: 12, category: "boat" }),
  ]);

  return (
    <CatalogPageFrame
      title="Boat Rides & River Tourism"
      intro="Routes, schedules, durations and prices from boat operators. Read the safety information before you book."
      crumbs={[{ label: "Boats" }]}
    >
      <PageSection title="Routes">
        <CatalogListClient
          catalogKey="boat-routes"
          noun="boat routes"
          initial={{ items: routes.items as CatalogItem[], nextCursor: routes.nextCursor }}
          fixedFilters={{ active: "true" }}
        />
      </PageSection>

      <PageSection title="Operators">
        {operators.items.length === 0 ? (
          <EmptyState title="No operators listed yet" description="Operators will appear here once added by our team." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {operators.items.map((o) => (
              <LocationCard key={o.id} {...cardFor("boat-operators", o as CatalogItem)} />
            ))}
          </div>
        )}
      </PageSection>

      <PageSection title="Registered local boat businesses">
        <BusinessListClient category="boat" initial={businesses} />
      </PageSection>
    </CatalogPageFrame>
  );
}
