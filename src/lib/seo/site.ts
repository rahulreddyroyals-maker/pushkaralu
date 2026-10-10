/**
 * Canonical site origin. Comes from NEXT_PUBLIC_SITE_URL (set per deployment) —
 * never hardcoded, because canonical/OG/sitemap URLs must match the domain
 * Google actually crawls. The localhost fallback is for local dev only.
 */
export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (!raw) return "http://localhost:3000";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

/** Absolute URL for a site path ("/ghats" -> "https://example.com/ghats"). Absolute inputs pass through. */
export function absoluteUrl(path: string, siteUrl: string = getSiteUrl()): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? siteUrl : `${siteUrl}${clean}`;
}
