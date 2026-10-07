import Link from "next/link";
import { CatalogPageFrame, PageSection } from "@/components/catalog/CatalogPageFrame";
import { CatalogListClient } from "@/components/catalog/CatalogListClient";
import { Card } from "@/components/ui";
import { loadPublicList } from "@/features/catalog/publicApi";
import type { CatalogItem } from "@/features/catalog/cards";
import { options } from "@/features/catalog/common";
import { PLACE_KINDS, PLACE_KIND_LABELS } from "@/features/tourism/definition";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tourism & Temple Tourism",
  description: "Tourist destinations, temple tourism, one-day and multi-day itineraries and travel packages.",
};

export default async function TourismPage() {
  const initial = await loadPublicList("tourism");
  return (
    <CatalogPageFrame
      title="Tourism"
      intro="Destinations and temple tourism around the river, plus ready-made itineraries and packages."
      crumbs={[{ label: "Tourism" }]}
    >
      <PageSection>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/tourism/itineraries">
            <Card hoverable padding="md">
              <p className="font-semibold text-ink">🗺️ Itineraries</p>
              <p className="mt-1 text-sm text-ink-muted">One-day and multi-day plans, stop by stop.</p>
            </Card>
          </Link>
          <Link href="/packages">
            <Card hoverable padding="md">
              <p className="font-semibold text-ink">🎒 Travel packages</p>
              <p className="mt-1 text-sm text-ink-muted">Packages with inclusions and departure dates.</p>
            </Card>
          </Link>
        </div>
      </PageSection>
      <PageSection title="Destinations">
        <CatalogListClient
          catalogKey="tourism"
          noun="places"
          initial={{ items: initial.items as CatalogItem[], nextCursor: initial.nextCursor }}
          filters={[{ key: "kind", label: "Category", options: options(PLACE_KINDS, PLACE_KIND_LABELS) }]}
        />
      </PageSection>
    </CatalogPageFrame>
  );
}
