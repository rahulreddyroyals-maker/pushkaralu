import { CatalogPageFrame, PageSection } from "@/components/catalog/CatalogPageFrame";
import { CatalogListClient } from "@/components/catalog/CatalogListClient";
import { BusinessListClient } from "@/features/businesses/components/BusinessListClient";
import { listBusinesses } from "@/features/businesses/api";
import { loadPublicList } from "@/features/catalog/publicApi";
import type { CatalogItem } from "@/features/catalog/cards";
import { options } from "@/features/catalog/common";
import { DIET_TYPES, DIET_TYPE_LABELS, PRICE_CATEGORIES, PRICE_CATEGORY_LABELS } from "@/features/restaurants/definition";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Restaurants & Food",
  description: "Vegetarian, family and budget restaurants near the ghats with open/closed status.",
};

export default async function RestaurantsPage() {
  const [initial, businesses] = await Promise.all([loadPublicList("restaurants"), listBusinesses({ pageSize: 12, category: "restaurant" })]);
  return (
    <CatalogPageFrame
      title="Restaurants & Food"
      intro="Find vegetarian and family-friendly places to eat. Open/closed is worked out from each restaurant's published hours."
      crumbs={[{ label: "Restaurants" }]}
    >
      <PageSection>
        <CatalogListClient
          catalogKey="restaurants"
          noun="restaurants"
          initial={{ items: initial.items as CatalogItem[], nextCursor: initial.nextCursor }}
          filters={[
            { key: "dietType", label: "Food type", options: options(DIET_TYPES, DIET_TYPE_LABELS) },
            { key: "priceCategory", label: "Price", options: options(PRICE_CATEGORIES, PRICE_CATEGORY_LABELS) },
            { key: "familyFriendly", label: "Family", options: [{ value: "true", label: "Family friendly" }] },
          ]}
        />
      </PageSection>
      <PageSection title="Registered local food businesses">
        <BusinessListClient category="restaurant" initial={businesses} />
      </PageSection>
    </CatalogPageFrame>
  );
}
