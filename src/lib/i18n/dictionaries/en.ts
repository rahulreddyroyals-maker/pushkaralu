/**
 * English base dictionary. This is the source of truth for available keys —
 * every other locale file must satisfy the same shape (enforced by the
 * `Dictionary` type in ../types.ts).
 *
 * Organize by feature/section as the app grows. Do not flatten into one
 * giant object per string — nested namespaces keep this navigable once
 * this file has hundreds of keys.
 */
import type { Dictionary } from "../types";

const en: Dictionary = {
  common: {
    appName: "Pushkaralu",
    loading: "Loading...",
    error: "Something went wrong",
    retry: "Try again",
    viewAll: "View all",
    seeDetails: "See details",
    updatedAgo: "Updated {{time}} ago",
  },
  nav: {
    home: "Home",
    explore: "Explore",
    services: "Services",
    bookings: "Bookings",
    profile: "Profile",
  },
  home: {
    heroTitle: "Your complete companion for Pushkaralu",
    heroSubtitle: "Ghats, temples, hotels, priests, travel and safety — all in one place",
  },
};

export default en;
