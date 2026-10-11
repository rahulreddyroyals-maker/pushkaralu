import type { GeoPoint } from "@/types/domain";

export type Lang = "en" | "te";
export interface Loc { en?: string; te?: string }

/** A record the assistant looked up on the platform. Everything in `facts` was formatted by our code from stored data — never by the model. */
export type VerifiedKind = "event" | "announcement" | "ghat" | "temple" | "hotel" | "purohit" | "transport" | "parking" | "emergency" | "itinerary" | "package" | "content";

export interface VerifiedItem {
  /** `${kind}:${id}` — the model cites items by this ref; the UI turns it into a link chip. */
  ref: string;
  kind: VerifiedKind;
  id: string;
  title: string;
  /** Site path the person can open to see the live record. */
  href: string;
  facts: { label: string; value: string }[];
  /** When manually-entered data was last set (ISO). */
  asOf?: string;
  /** Honest caveat shown with the card ("entered manually by event staff", "may be out of date"). */
  note?: string;
}

/** The read-only platform data the assistant may use. Implemented over Firestore in dataAdapter.ts, faked in tests. Published/verified records only; private fields never appear here. */
export interface EventLite { id: string; name: Loc; description: Loc; startDate: string; endDate: string; status: string; river: string }
export interface AnnouncementLite { id: string; eventId: string; title: Loc; body: Loc; createdAt: string }
export interface GhatLite {
  id: string; eventId: string; name: Loc; description: Loc; location: GeoPoint; facilities: string[];
  crowdStatus: string; crowdStatusUpdatedAt: string; crowdReported: boolean; waitMinutes?: number | null;
  operationalStatus: string; alternativeGhatId?: string | null; statusNote?: string; parkingInfo: Loc; medicalInfo: Loc;
}
export interface TempleLite { id: string; name: Loc; description: Loc; timings: string; address: string; location: GeoPoint; nearbyAttractions: string[] }
export interface HotelLite { id: string; name: Loc; address: string; location: GeoPoint; amenities: string[]; priceMin: number; priceMax: number }
export interface PurohitLite { id: string; name: Loc; languages: string[]; experienceYears: number; address: string; location: GeoPoint; pricingNote: Loc; availabilityNote: Loc }
export interface TransportLite {
  id: string; kind: string; name: Loc; serviceArea: Loc; address: string; location: GeoPoint; pricingModel: string; amountInr?: number;
  pricingNote: Loc; operatingHours?: string; departures: { from: string; to: string; time: string; notes?: string }[]; availableForEvents: string[];
}
export interface ParkingLite {
  id: string; name: Loc; address: string; location: GeoPoint; capacity: number; status: string; statusUpdatedAt?: string;
  vehicleTypes: string[]; opensAt?: string; closesAt?: string; availableForEvents: string[];
}
export interface EmergencyLite {
  id: string; kind: string; name: Loc; phone: string; alternatePhone?: string; address?: string; location?: GeoPoint;
  open24x7: boolean; openingHours?: string; verifiedOn: string; verificationSource: string;
}
export interface ItineraryLite {
  id: string; title: Loc; summary: Loc; durationDays: number; suitableFor: string[];
  days: { title: Loc; stops: { time?: string; title: Loc; durationMinutes?: number }[] }[]; tips: Loc; availableForEvents: string[];
}
export interface PackageLite { id: string; title: Loc; summary: Loc; durationDays: number; nights: number; priceFromInr?: number; priceNote: Loc; departureCity?: string }
export interface ContentLite { section: "articles" | "pilgrim-guides" | "faqs" | "location-pages" | "service-pages"; slug: string; title: Loc; summary: Loc; body: Loc; topic: string; updatedAt: string }

export interface AssistantData {
  events(): Promise<EventLite[]>;
  announcements(eventId: string): Promise<AnnouncementLite[]>;
  ghats(eventId: string): Promise<GhatLite[]>;
  temples(): Promise<TempleLite[]>;
  hotels(): Promise<HotelLite[]>;
  purohits(): Promise<PurohitLite[]>;
  transport(): Promise<TransportLite[]>;
  parking(): Promise<ParkingLite[]>;
  emergency(): Promise<EmergencyLite[]>;
  itineraries(): Promise<ItineraryLite[]>;
  packages(): Promise<PackageLite[]>;
  content(): Promise<ContentLite[]>;
}

export interface AssistantReply {
  /** Model-written text, already passed through the grounding guard and citation resolver. Always shown as "AI guidance". */
  guidance: string;
  /** Platform records looked up for this answer — always shown as "Verified platform data". */
  verified: VerifiedItem[];
  lang: Lang;
  /** Why a sentence was removed or a safe fallback was used, for transparency (shown as a small note). */
  notices: string[];
  /** True when the answer is a fixed safety response rather than model output. */
  safetyResponse?: boolean;
}
