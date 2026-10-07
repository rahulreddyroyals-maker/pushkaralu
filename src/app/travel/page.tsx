import { CatalogPageFrame, PageSection } from "@/components/catalog/CatalogPageFrame";
import { CatalogListClient } from "@/components/catalog/CatalogListClient";
import { BusinessListClient } from "@/features/businesses/components/BusinessListClient";
import { listBusinesses } from "@/features/businesses/api";
import { loadPublicList } from "@/features/catalog/publicApi";
import type { CatalogItem } from "@/features/catalog/cards";
import { TRANSPORT_KINDS, TRANSPORT_KIND_LABELS } from "@/features/transport/definition";
import { options } from "@/features/catalog/common";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Travel & Transport",
  description: "Taxis, airport and railway transfers, buses, trains and local travel for pilgrims.",
};

const BUSINESS_CATEGORIES = ["taxi", "travel_operator"] as const;

export default async function TravelPage() {
  const [transport, businesses] = await Promise.all([
    loadPublicList("transport"),
    listBusinesses({ pageSize: 12, category: [...BUSINESS_CATEGORIES] }),
  ]);

  return (
    <CatalogPageFrame
      title="Travel & Transport"
      intro="Taxis, airport and railway transfers, buses, trains and local travel. Prices shown are indicative — confirm when you inquire."
      crumbs={[{ label: "Travel" }]}
    >
      <PageSection>
        <CatalogListClient
          catalogKey="transport"
          noun="transport options"
          initial={{ items: transport.items as CatalogItem[], nextCursor: transport.nextCursor }}
          filters={[{ key: "kind", label: "Type", options: options(TRANSPORT_KINDS, TRANSPORT_KIND_LABELS) }]}
        />
      </PageSection>
      <PageSection title="Registered local operators">
        <BusinessListClient category={[...BUSINESS_CATEGORIES]} initial={businesses} />
      </PageSection>
    </CatalogPageFrame>
  );
}
