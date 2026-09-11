export const LEAD_PROVIDER_TYPES = ["hotel", "purohit", "business"] as const;
export type LeadProviderType = (typeof LEAD_PROVIDER_TYPES)[number];

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
  providerType: LeadProviderType;
  userId: string;
  userDisplayName: string;
  userContactPhone: string;
  message: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}
