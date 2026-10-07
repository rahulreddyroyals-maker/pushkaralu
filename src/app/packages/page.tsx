import { CatalogPageFrame, PageSection } from "@/components/catalog/CatalogPageFrame";
import { CatalogListClient } from "@/components/catalog/CatalogListClient";
import { loadPublicList } from "@/features/catalog/publicApi";
import type { CatalogItem } from "@/features/catalog/cards";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Travel Packages",
  description: "Pilgrimage and tourism packages with inclusions, departure dates and indicative prices.",
};

export default async function PackagesPage() {
  const initial = await loadPublicList("packages");
  return (
    <CatalogPageFrame
      title="Travel Packages"
      intro="Pilgrimage and tourism packages. Prices are indicative — send an inquiry to confirm availability and the final price."
      crumbs={[{ label: "Packages" }]}
    >
      <PageSection>
        <CatalogListClient catalogKey="packages" noun="packages" initial={{ items: initial.items as CatalogItem[], nextCursor: initial.nextCursor }} />
      </PageSection>
    </CatalogPageFrame>
  );
}
