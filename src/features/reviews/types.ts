import type { LeadProviderType } from "@/features/leads/types";

/**
 * reviews/{reviewId} — top-level. NOTE: not yet gated to "only after a
 * completed booking" since the Booking module doesn't exist yet (see
 * docs/SPRINT_DEPENDENCY_MAP.md) — any signed-in user can review any
 * provider for now. Revisit this once bookings ship, per
 * docs/DATABASE_SCHEMA.md's original design intent.
 */
export interface Review {
  id: string;
  providerId: string;
  providerType: LeadProviderType;
  userId: string;
  userDisplayName: string;
  rating: number; // 1-5
  text: string;
  createdAt: string;
}

export interface ReviewAggregate {
  count: number;
  average: number;
}
