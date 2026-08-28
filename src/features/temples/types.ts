import type { LocalizedText, GeoPoint, SeoMetadata } from "@/types/domain";

/** temples/{templeId} — event-agnostic, Spec Module 8. */
export interface Temple {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  history: LocalizedText;
  timings: string; // free-text, e.g. "6:00 AM - 12:00 PM, 4:00 PM - 8:00 PM"
  location: GeoPoint;
  address: string;
  images: string[];
  nearbyAttractions: string[]; // free-text names — not references, keeps this decoupled from other entity types per Sprint 3 scope
  published: boolean;
  seo: SeoMetadata;
  createdAt: string;
  updatedAt: string;
}
