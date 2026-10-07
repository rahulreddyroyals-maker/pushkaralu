export const LEAD_PROVIDER_TYPES = ["hotel", "purohit", "business"] as const;
export type LeadProviderType = (typeof LEAD_PROVIDER_TYPES)[number];

/**
 * Inquiry targets that are admin-managed catalog records (Sprint 6) rather than
 * provider-owned listings. They have no owner account, so inquiries are
 * handled by platform admins (Admin > Inquiries) and they can't be booked or
 * reviewed through the owner-based flows above, which still only accept
 * LeadProviderType.
 */
export const CATALOG_LEAD_TYPES = ["transport", "boat_route", "travel_package"] as const;
export type CatalogLeadType = (typeof CATALOG_LEAD_TYPES)[number];

/** Catalog registry key + collection that each catalog lead type points at (used to verify the target exists and is published). */
export const CATALOG_LEAD_TARGETS: Record<CatalogLeadType, { catalogKey: string }> = {
  transport: { catalogKey: "transport" },
  boat_route: { catalogKey: "boat-routes" },
  travel_package: { catalogKey: "packages" },
};

export const ALL_LEAD_TYPES = [...LEAD_PROVIDER_TYPES, ...CATALOG_LEAD_TYPES] as const;
export type AnyLeadType = (typeof ALL_LEAD_TYPES)[number];

export function isCatalogLeadType(value: string): value is CatalogLeadType {
  return (CATALOG_LEAD_TYPES as readonly string[]).includes(value);
}

export const LEAD_STATUSES = ["NEW", "CONTACTED", "CLOSED"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * leads/{leadId} — the inquiry/booking-request mechanism for spec Module
 * 4 ("inquiry/booking request") ahead of the real Booking module (a later
 * sprint per docs/SPRINT_DEPENDENCY_MAP.md). This is intentionally the
 * ONLY way a public visitor reaches a provider — public pages never
 * render the provider's raw contact info directly (see Hotel.contactPhone
 * comment) — so a lead also carries the VISITOR's phone number, for the
 * provider to call back.
 */
export interface Lead {
  id: string;
  providerId: string;
  providerType: AnyLeadType;
  userId: string;
  userDisplayName: string;
  userContactPhone: string;
  message: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}
