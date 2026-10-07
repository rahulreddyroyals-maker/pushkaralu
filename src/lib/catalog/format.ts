import type { GeoPoint } from "@/types/domain";

/** "Updated 10 minutes ago" — spec Module 3: manual info must never look automatic. */
export function formatRelativeTime(iso: string | undefined | null, now: Date = new Date()): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then) || then <= 0) return null;
  const seconds = Math.max(0, Math.round((now.getTime() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function isStale(iso: string | undefined | null, maxAgeHours: number, now: Date = new Date()): boolean {
  if (!iso) return true;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then) || then <= 0) return true;
  return now.getTime() - then > maxAgeHours * 3_600_000;
}

/** Turn-by-turn navigation link (opens the Maps app on phones). Provider-agnostic URL, no API key needed. */
export function directionsUrl(destination: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** Locale-aware pick with English fallback — the one place content language is resolved. */
export function pick(text: { en?: string; te?: string; [k: string]: string | undefined } | undefined | null, locale = "en"): string {
  if (!text) return "";
  return text[locale] || text.en || "";
}
