import { CatalogPageFrame, PageSection } from "@/components/catalog/CatalogPageFrame";
import { CatalogListClient } from "@/components/catalog/CatalogListClient";
import { loadPublicList } from "@/features/catalog/publicApi";
import type { CatalogItem } from "@/features/catalog/cards";
import { options } from "@/features/catalog/common";
import { PARKING_STATUSES, PARKING_STATUS_LABELS, PARKING_TYPES, PARKING_TYPE_LABELS } from "@/features/parking/definition";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Parking near the Ghats",
  description: "Parking locations with capacity, pricing, status and walking distance to the ghats.",
};

export default async function ParkingPage() {
  const initial = await loadPublicList("parking");
  return (
    <CatalogPageFrame
      title="Parking"
      intro="Parking near the ghats. Status is entered by our team and shows when it was last updated — treat it as a guide, not a live feed."
      crumbs={[{ label: "Parking" }]}
    >
      <PageSection>
        <CatalogListClient
          catalogKey="parking"
          noun="parking locations"
          initial={{ items: initial.items as CatalogItem[], nextCursor: initial.nextCursor }}
          filters={[
            { key: "status", label: "Status", options: options(PARKING_STATUSES, PARKING_STATUS_LABELS) },
            { key: "parkingType", label: "Type", options: options(PARKING_TYPES, PARKING_TYPE_LABELS) },
          ]}
        />
      </PageSection>
    </CatalogPageFrame>
  );
}
