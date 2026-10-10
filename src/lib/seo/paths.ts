/** Locale-aware paths. English lives at "/x", Telugu at "/te/x". Pure. */
export type SeoLang = "en" | "te";
export const TELUGU_PREFIX = "/te";

export function localizedPath(path: string, lang: SeoLang): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (lang === "en") return clean;
  return clean === "/" ? TELUGU_PREFIX : `${TELUGU_PREFIX}${clean}`;
}

export function stripLangPrefix(path: string): { lang: SeoLang; path: string } {
  if (path === TELUGU_PREFIX) return { lang: "te", path: "/" };
  if (path.startsWith(`${TELUGU_PREFIX}/`)) return { lang: "te", path: path.slice(TELUGU_PREFIX.length) };
  return { lang: "en", path };
}

export const OG_LOCALE: Record<SeoLang, string> = { en: "en_IN", te: "te_IN" };
