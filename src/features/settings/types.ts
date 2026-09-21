/**
 * settings/monetization — a single document, SUPER_ADMIN-only write (see
 * firestore.rules `match /settings/{key}`, already scoped this way back
 * in Sprint 2's forward-looking rules). This is the ONE place commission
 * rates, lead fees, and featured-listing prices live — spec: "Do NOT
 * hardcode commission values."
 *
 * Every reader of these values (booking creation, admin reports) goes
 * through getMonetizationSettings() in api.ts, never a literal number.
 */
export interface MonetizationSettings {
  /** Percentage (0-100) taken as commission on a booking's amount. */
  bookingCommissionPercent: number;
  /** Flat fee (₹) charged per lead — 0 means leads are currently free. */
  leadFee: number;
  /** ₹ price to feature a listing, shown on the (future) provider-facing "feature this listing" upsell. */
  featuredListingPrice: number;
  /** ₹ price for a sponsored listing/placement. */
  sponsoredListingPrice: number;
  updatedAt: string;
}

/**
 * Used only when settings/monetization doesn't exist yet (a brand-new
 * project before any admin has visited the settings page). This is a
 * BOOTSTRAP fallback, not a hardcoded business rule — the first time
 * SUPER_ADMIN saves the settings form, this stops being used at all.
 * Documented here, in one place, rather than as a magic number wherever
 * commission gets calculated.
 */
export const DEFAULT_MONETIZATION_SETTINGS: Omit<MonetizationSettings, "updatedAt"> = {
  bookingCommissionPercent: 10,
  leadFee: 0,
  featuredListingPrice: 999,
  sponsoredListingPrice: 1999,
};
