import type { LocalizedText, GeoPoint, SeoMetadata, CrowdStatus } from "@/types/domain";

export const GHAT_FACILITIES = [
  "parking",
  "toilets",
  "drinking_water",
  "medical",
  "food_stalls",
  "wheelchair_access",
  "changing_rooms",
] as const;
export type GhatFacility = (typeof GHAT_FACILITIES)[number];

export const GHAT_FACILITY_LABELS: Record<GhatFacility, string> = {
  parking: "Parking",
  toilets: "Toilets",
  drinking_water: "Drinking water",
  medical: "Medical",
  food_stalls: "Food stalls",
  wheelchair_access: "Wheelchair access",
  changing_rooms: "Changing rooms",
};

/** events/{eventId}/ghats/{ghatId} — Spec Module 2 + 3. */
export interface Ghat {
  id: string;
  eventId: string;
  name: LocalizedText;
  description: LocalizedText;
  images: string[];
  location: GeoPoint;
  facilities: GhatFacility[];
  crowdStatus: CrowdStatus;
  crowdStatusUpdatedAt: string;
  crowdStatusUpdatedBy: string | null;
  parkingInfo: LocalizedText;
  medicalInfo: LocalizedText;
  published: boolean;
  seo: SeoMetadata;
  createdAt: string;
  updatedAt: string;
}
