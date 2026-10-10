import type { Metadata } from "next";
import { absoluteUrl } from "./site";
import { localizedPath, OG_LOCALE, type SeoLang } from "./paths";
import { metaDescription, truncate, META_TITLE_MAX } from "./text";

export interface PageSeoInput {
  title: string;
  description?: string | null;
  /** Site path in the page's own language, e.g. "/articles/x" (English) — the builder adds /te for Telugu. */
  path: string;
  lang?: SeoLang;
  /** Languages that actually have content for this page. Drives hreflang; a language is never advertised without real content. */
  availableLangs?: SeoLang[];
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  /** Replaces the root layout's "%s | Pushkaralu" template (use for titles that already carry the brand). */
  absoluteTitle?: boolean;
}

/** Title with a length cap. The "| Pushkaralu" suffix is added by the root layout template. */
export function pageTitle(title: string): string {
  return truncate(title, META_TITLE_MAX);
}

/**
 * One place that turns page data into Next metadata: canonical, hreflang,
 * Open Graph, Twitter, robots. `path` is the English-form path; for Telugu
 * the canonical is the /te version (each language canonicalises to itself,
 * with hreflang cross-links — Google's recommended pattern).
 */
export function buildMetadata(input: PageSeoInput, siteUrl?: string): Metadata {
  const lang = input.lang ?? "en";
  const title = pageTitle(input.title);
  const description = metaDescription(input.description);
  const canonical = absoluteUrl(localizedPath(input.path, lang), siteUrl);
  const langs = input.availableLangs ?? [lang];

  const languages: Record<string, string> = {};
  for (const l of langs) languages[l === "en" ? "en-IN" : "te-IN"] = absoluteUrl(localizedPath(input.path, l), siteUrl);
  if (langs.includes("en")) languages["x-default"] = absoluteUrl(localizedPath(input.path, "en"), siteUrl);

  const images = input.image ? [{ url: absoluteUrl(input.image, siteUrl) }] : undefined;

  return {
    title: input.absoluteTitle ? { absolute: title } : title,
    description: description || undefined,
    alternates: { canonical, languages: langs.length > 1 ? languages : undefined },
    robots: input.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: input.type ?? "website",
      title,
      description: description || undefined,
      url: canonical,
      siteName: "Pushkaralu",
      locale: OG_LOCALE[lang],
      images,
      ...(input.type === "article" && { publishedTime: input.publishedTime, modifiedTime: input.modifiedTime }),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description: description || undefined,
      images: images?.map((i) => i.url),
    },
  };
}
