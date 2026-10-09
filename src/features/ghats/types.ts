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

export const OPERATIONAL_STATUSES = ["OPEN", "CLOSED"] as const;
export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number] | "UNKNOWN";

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
  /** null = nobody has reported yet. The default "LOW" is then a placeholder, NOT a report, and must be shown as "not reported". */
  crowdStatusUpdatedBy: string | null;
  /** Staff-estimated queue time. null/absent = not reported (never shown as 0). */
  waitMinutes?: number | null;
  /** UNKNOWN until staff say otherwise — a ghat is never shown "open" by default. */
  operationalStatus: OperationalStatus;
  /** Another ghat staff suggest while this one is crowded or closed (same event). */
  alternativeGhatId?: string | null;
  statusNote?: string;
  parkingInfo: LocalizedText;
  medicalInfo: LocalizedText;
  published: boolean;
  seo: SeoMetadata;
  createdAt: string;
  updatedAt: string;
}
