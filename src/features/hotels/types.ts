import type { LocalizedText, GeoPoint, SeoMetadata, ApprovalStatus } from "@/types/domain";

export const HOTEL_AMENITIES = [
  "wifi",
  "ac",
  "parking",
  "restaurant",
  "room_service",
  "hot_water",
  "elevator",
  "pilgrim_friendly_timings",
] as const;
export type HotelAmenity = (typeof HOTEL_AMENITIES)[number];

/** hotels/{hotelId} — top-level, event-agnostic (spec Module 4). */
export interface Hotel {
  id: string;
  ownerId: string;
  name: LocalizedText;
  description: LocalizedText;
  images: string[];
  address: string;
  location: GeoPoint;
  /**
   * Stored for the owner/admin to see and for the inquiry flow to relay
   * messages, but the PUBLIC detail page never renders this directly —
   * visitors use the "Send inquiry" form (features/leads) instead.
   * NOTE: this is a UI-level protection, not a data-level one — once a
   * listing is VERIFIED, the whole Firestore document (including this
   * field) becomes readable by anyone querying it directly via the
   * client SDK, since Firestore rules don't support field-level
   * restrictions without splitting into a separate private subdocument.
   * That split is a reasonable future hardening step, not done here.
   */
  contactPhone: string;
  amenities: HotelAmenity[];
  priceRangeMin: number;
  priceRangeMax: number;
  policies: LocalizedText;
  approvalStatus: ApprovalStatus;
  seo: SeoMetadata;
  createdAt: string;
  updatedAt: string;
}
