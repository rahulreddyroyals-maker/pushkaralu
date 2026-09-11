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
  tourism: "/tourism",
  packages: "/packages",
  businesses: "/businesses",
  guides: "/guides",
  lostAndFound: "/lost-and-found",
  registerBusiness: "/register-business",
  about: "/about",
  contact: "/contact",
} as const;
