/**
 * Explicit dictionary shape — the single source of truth for translation
 * keys. Deliberately typed with `string` values (not string literals via
 * `as const`) so every locale file (en.ts, te.ts, future hi.ts...) can
 * satisfy this exact shape while containing genuinely different text.
 * TypeScript still catches missing/extra/misspelled keys in any locale.
 */
export interface Dictionary {
  common: {
    appName: string;
    loading: string;
    error: string;
    retry: string;
    viewAll: string;
    seeDetails: string;
    updatedAgo: string;
  };
  nav: {
    home: string;
    explore: string;
    services: string;
    bookings: string;
    profile: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
  };
}

export const SUPPORTED_LOCALES = ["en", "te"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
