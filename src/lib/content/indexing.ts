import { wordCount } from "@/lib/seo/text";
import type { SeoLang } from "@/lib/seo/paths";

/**
 * Thin-content guard. A published page with almost no text is useful to a
 * visitor who followed a link, but it is not worth a search engine's index
 * and can drag down the whole site's quality signals. Such pages stay
 * reachable but are marked noindex and left out of the sitemap — the
 * editor fixes it by writing more, not by gaming the check.
 */
export const MIN_INDEXABLE_WORDS = {
  articles: 120,
  "pilgrim-guides": 120,
  "location-pages": 60,
  "service-pages": 60,
  faqs: 12,
} as const;

export type ContentKey = keyof typeof MIN_INDEXABLE_WORDS;

export interface Localized { en?: string; te?: string }

export function pickLang(text: Localized | undefined, lang: SeoLang): string {
  return (text?.[lang] ?? "").trim();
}

/** A Telugu page exists only when both title and body are written in Telugu. */
export function hasLanguage(rec: { title?: Localized; body?: Localized }, lang: SeoLang): boolean {
  return Boolean(pickLang(rec.title, lang) && pickLang(rec.body, lang));
}

export function availableLangs(rec: { title?: Localized; body?: Localized }): SeoLang[] {
  return (["en", "te"] as const).filter((l) => hasLanguage(rec, l));
}

export function isIndexable(key: ContentKey, rec: { title?: Localized; body?: Localized; noindex?: boolean }, lang: SeoLang): boolean {
  if (rec.noindex) return false;
  if (!hasLanguage(rec, lang)) return false;
  return wordCount(pickLang(rec.body, lang)) >= MIN_INDEXABLE_WORDS[key];
}
