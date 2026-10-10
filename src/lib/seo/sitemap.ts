import type { MetadataRoute } from "next";
import { absoluteUrl } from "./site";
import { localizedPath, type SeoLang } from "./paths";

export type SitemapEntry = MetadataRoute.Sitemap[number];

export interface SitemapInput {
  /** English-form path, e.g. "/articles/x". */
  path: string;
  lastModified?: string | Date;
  changeFrequency?: SitemapEntry["changeFrequency"];
  priority?: number;
  /** Languages that have real, indexable content. Each gets its own <url> with hreflang alternates when more than one. */
  langs?: SeoLang[];
}

/** Expands inputs into sitemap entries (one per language) with hreflang alternates, deduplicated by URL. */
export function buildSitemap(inputs: SitemapInput[], siteUrl?: string): SitemapEntry[] {
  const seen = new Set<string>();
  const out: SitemapEntry[] = [];
  for (const input of inputs) {
    const langs = input.langs?.length ? input.langs : (["en"] as SeoLang[]);
    const languages: Record<string, string> = {};
    for (const l of langs) languages[l === "en" ? "en-IN" : "te-IN"] = absoluteUrl(localizedPath(input.path, l), siteUrl);
    for (const l of langs) {
      const url = absoluteUrl(localizedPath(input.path, l), siteUrl);
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        lastModified: input.lastModified,
        changeFrequency: input.changeFrequency,
        priority: input.priority,
        alternates: langs.length > 1 ? { languages } : undefined,
      });
    }
  }
  return out;
}

/** Path prefixes that must never be crawled: private, transactional, or API. */
export const DISALLOWED_PATHS = [
  "/admin", "/api/", "/profile", "/provider", "/bookings", "/family", "/notifications",
  "/lost-and-found/report", "/lost-and-found/mine", "/login", "/register",
];
