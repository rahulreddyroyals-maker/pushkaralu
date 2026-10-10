/**
 * App-level constants only. This is NOT the place for business data.
 *
 * Per spec §44, the following must be admin-configurable via Firestore
 * (`settings` collection), never hardcoded here:
 *   - event dates / event name / river
 *   - provider commissions, booking fees, featured listing prices
 *   - advertisement placements
 *   - notification templates
 *   - categories, homepage sections
 *
 * This file only holds things that are genuinely static to the codebase
 * (route segments, supported locales, brand name fallback).
 */

export const APP_NAME = "Pushkaralu";

export const DEFAULT_SEO = {
  titleSuffix: " | Pushkaralu",
  defaultOgImage: "/og-default.jpg",
};

/** Route segments used across the app — keep in sync with docs/ROUTE_MAP.md */
export const ROUTES = {
  home: "/",
  events: "/events",
  ghats: "/ghats",
  temples: "/temples",
  hotels: "/hotels",
  purohits: "/purohits",
  rituals: "/rituals",
  travel: "/travel",
  boats: "/boats",
  restaurants: "/restaurants",
  parking: "/parking",
  emergency: "/emergency",
  news: "/news",
  articles: "/articles",
  pilgrimGuides: "/pilgrim-guides",
  faqs: "/faqs",
  locations: "/locations",
  services: "/services",
  tourism: "/tourism",
  packages: "/packages",
  itineraries: "/tourism/itineraries",
  businesses: "/businesses",
  guides: "/guides",
  bookings: "/bookings",
  lostAndFound: "/lost-and-found",
  family: "/family",
  notifications: "/notifications",
  registerBusiness: "/register-business",
  about: "/about",
  contact: "/contact",
} as const;

/**
 * Manually-entered operational status (parking, boat service) older than this
 * is flagged "may be outdated" on public pages — manual data must never look live
 * (spec Module 3). A display rule, not business data; the *times* shown always
 * come from the record's own status-updated timestamp.
 */
export const MANUAL_STATUS_STALE_HOURS = 6;

/**
 * Sprint 7 safety limits. These are abuse-prevention and privacy defaults
 * (not business data): the numbers live here, in one place, so they are
 * reviewed together rather than scattered through route handlers.
 */
export const SAFETY_LIMITS = {
  /** Emergency directory entries whose verification is older than this show a "may be out of date" warning. */
  emergencyReverifyDays: 30,
  /** Lost & Found: reports one account may submit per rolling 24h. */
  lostFoundReportsPerDay: 5,
  /** Lost & Found: responses one account may send to a single report. */
  lostFoundResponsesPerReport: 3,
  /** Family: groups one account may own / members per group. */
  familyGroupsPerOwner: 5,
  familyMembersPerGroup: 15,
  /** Family invite codes expire after this long. */
  familyInviteTtlHours: 48,
  /** Location sharing always has an end time; this is the longest a member may choose. */
  familyMaxShareHours: 24,
  /** Family emergency alerts one member may send per rolling hour. */
  familyAlertsPerHour: 5,
} as const;

/**
 * Sprint 8 notification behaviour. Like SAFETY_LIMITS these are delivery and
 * abuse-prevention defaults (not business data), kept in one place.
 */
export const NOTIFY_LIMITS = {
  /** Campaigns one staff account may create per rolling hour. */
  campaignsPerActorPerHour: 20,
  /** Recipients processed per batch, and batches a single request may run before leaving the rest to the scheduler. */
  batchSize: 200,
  inlineBatches: 3,
  /** A claimed campaign is exclusive to one worker this long; after that another run may resume it. */
  leaseSeconds: 120,
  /** A campaign that throws this many times is marked FAILED instead of retrying forever. */
  maxAttempts: 3,
  /** Don't send the same crowd alert (same ghat + same level) again within this window. */
  crowdAlertCooldownMinutes: 30,
  /** Event reminders go out once, when an event is within this many hours of starting. */
  eventReminderHoursBefore: [24],
  maxTokensPerUser: 5,
  maxFollowsPerUser: 50,
  scheduleMaxDays: 365,
  inboxPageSize: 20,
} as const;
