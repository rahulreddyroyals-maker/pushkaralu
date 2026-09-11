import type { LocalizedText, GeoPoint, SeoMetadata, ApprovalStatus } from "@/types/domain";
import type { Role } from "@/types/roles";

/**
 * One generic categorized collection rather than six near-identical ones
 * (taxis, travel operators, boats, restaurants, local businesses, guides)
 * — spec Module 6/7/9/20 all describe the same shape (name, description,
 * location, contact, category-specific note) with different labels.
 * Boats keep a reserved but unused `boatOperators` collection in
 * firestore.rules for a future richer Boat Tourism module (routes,
 * schedules — spec Module 7) that doesn't fit this generic shape; for
 * this sprint, boats are just another category here.
 */
export const BUSINESS_CATEGORIES = ["taxi", "travel_operator", "boat", "restaurant", "local_business", "guide"] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  taxi: "Taxi",
  travel_operator: "Travel Operator",
  boat: "Boat / River Tourism",
  restaurant: "Restaurant",
  local_business: "Local Business",
  guide: "Guide",
};

/** Which role a business of this category grants its owner once approved — see requireApiRole usage in the admin approval route. */
export const BUSINESS_CATEGORY_ROLE: Record<BusinessCategory, Role> = {
  taxi: "TRAVEL_OPERATOR",
  travel_operator: "TRAVEL_OPERATOR",
  boat: "BOAT_OPERATOR",
  restaurant: "BUSINESS_OWNER",
  local_business: "BUSINESS_OWNER",
  guide: "BUSINESS_OWNER",
};

/** businesses/{businessId} — top-level, event-agnostic. */
export interface Business {
  id: string;
  ownerId: string;
  category: BusinessCategory;
  name: LocalizedText;
  description: LocalizedText;
  images: string[];
  address: string;
  location: GeoPoint;
  /** Same public-exposure caveat as Hotel.contactPhone. */
  contactPhone: string;
  pricingNote: LocalizedText;
  approvalStatus: ApprovalStatus;
  seo: SeoMetadata;
  createdAt: string;
  updatedAt: string;
}
