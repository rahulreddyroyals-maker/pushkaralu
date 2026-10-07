import { CatalogPageFrame, PageSection } from "@/components/catalog/CatalogPageFrame";
import { CatalogListClient } from "@/components/catalog/CatalogListClient";
import { loadPublicList } from "@/features/catalog/publicApi";
import type { CatalogItem } from "@/features/catalog/cards";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Itineraries",
  description: "One-day and multi-day itineraries for pilgrims and tourists.",
};

export default async function ItinerariesPage() {
  const initial = await loadPublicList("itineraries");
  return (
    <CatalogPageFrame
      title="Itineraries"
      intro="One-day and multi-day plans, stop by stop."
      crumbs={[{ label: "Tourism", href: "/tourism" }, { label: "Itineraries" }]}
    >
      <PageSection>
        <CatalogListClient
          catalogKey="itineraries"
          noun="itineraries"
          initial={{ items: initial.items as CatalogItem[], nextCursor: initial.nextCursor }}
          filters={[
            {
              key: "tripType",
              label: "Trip length",
              options: [
                { value: "ONE_DAY", label: "One day" },
                { value: "MULTI_DAY", label: "Multi-day" },
              ],
            },
          ]}
        />
      </PageSection>
    </CatalogPageFrame>
  );
}
