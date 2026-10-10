/** Text helpers for titles and descriptions. Pure. */

export const META_DESCRIPTION_MAX = 160;
export const META_TITLE_MAX = 60;

export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** Truncate at a word boundary with an ellipsis; never cuts mid-word unless a single word exceeds the limit. */
export function truncate(input: string, max: number): string {
  const text = collapseWhitespace(input);
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s,.;:–—-]+$/, "")}…`;
}

export function metaDescription(input: string | undefined | null, fallback = ""): string {
  const text = collapseWhitespace(input ?? "");
  return truncate(text || fallback, META_DESCRIPTION_MAX);
}

/** Lowercase URL slug. Keeps ASCII letters/digits only (Telugu content uses an English slug, as search engines handle it better in URLs). */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function isValidSlug(value: string): boolean {
  return value.length >= 3 && value.length <= 100 && SLUG_PATTERN.test(value);
}

/** Words in a text (Latin or Telugu) — used for the thin-content check and reading time. */
export function wordCount(input: string): number {
  const text = collapseWhitespace(input);
  return text ? text.split(" ").length : 0;
}

export function readingMinutes(input: string, wordsPerMinute = 200): number {
  return Math.max(1, Math.round(wordCount(input) / wordsPerMinute));
}
