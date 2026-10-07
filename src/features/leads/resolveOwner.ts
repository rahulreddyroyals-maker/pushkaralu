import { getHotel } from "@/features/hotels/api";
import { getPurohit } from "@/features/purohits/api";
import { getBusiness } from "@/features/businesses/api";
import { isCatalogLeadType, type AnyLeadType, type LeadProviderType } from "@/features/leads/types";

/**
 * Maps a (providerType, providerId) pair to the owning user's UID.
 * Extracted here because leads, lead-status, and now bookings all need
 * the same lookup — previously this was duplicated in two route files,
 * which is exactly the kind of thing that drifts apart silently.
 *
 * Uses includeUnverified: true deliberately — a booking or inquiry
 * against a listing that was verified at the time but has since been
 * suspended still needs its owner resolvable, otherwise the provider
 * would lose access to their own historical bookings.
 *
 * Admin-managed catalog targets (transport, boat routes, packages) have no
 * owner, so this returns null for them: bookings against them are refused
 * ("Provider not found") and only admins can read/update their leads.
 */
export async function resolveListingOwnerId(
  providerType: AnyLeadType,
  providerId: string
): Promise<string | null> {
  if (isCatalogLeadType(providerType)) return null;
  const ownedType: LeadProviderType = providerType;
  if (ownedType === "hotel") {
    return (await getHotel(providerId, { includeUnverified: true }))?.ownerId ?? null;
  }
  if (ownedType === "purohit") {
    return (await getPurohit(providerId, { includeUnverified: true }))?.userId ?? null;
  }
  return (await getBusiness(providerId, { includeUnverified: true }))?.ownerId ?? null;
}
