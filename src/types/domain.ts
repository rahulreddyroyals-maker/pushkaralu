/**
 * Core cross-feature domain types.
 * Feature-specific types (Ghat, Purohit, Hotel, etc.) live inside each
 * feature folder (src/features/<feature>/types.ts) and are added in the
 * sprint that implements that feature — not created speculatively here.
 */

export type SupportedLocale = "en" | "te";

/** Verification / moderation lifecycle used across providers, listings, reviews. */
export type ApprovalStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";

/** Booking lifecycle — Spec Module 18. */
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "REFUNDED";

/** Ghat crowd status — Spec Module 3. */
export type CrowdStatus = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface LocalizedText {
  en: string;
  te: string;
  // Future locales (hi, ta, kn, ml) can be added without a schema migration
  // since this is a map, not fixed columns.
  [locale: string]: string | undefined;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface SeoMetadata {
  title: LocalizedText;
  description: LocalizedText;
  canonicalPath: string;
  ogImage?: string;
}

/**
 * Root entity of the whole platform — Spec §2.
 * Every event-scoped feature (ghats, crowd status, schedules) references
 * this by eventId. Event-agnostic providers (hotels, purohits, businesses)
 * instead carry an `availableForEvents: string[]` array.
 */
export interface PushkaraluEvent {
  id: string;
  name: LocalizedText;
  river: "GODAVARI" | "KRISHNA" | "TUNGABHADRA" | "OTHER";
  year: number;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  description: LocalizedText;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  /** Publish/unpublish toggle — separate from lifecycle `status` above. Unpublished events are staff-only (see firestore.rules). */
  published: boolean;
  featuredImage?: string;
  seo: SeoMetadata;
  createdAt: string;
  updatedAt: string;
}
