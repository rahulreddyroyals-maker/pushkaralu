import type { Lang } from "./types";

const TELUGU = /[ఀ-౿]/g;

/** Telugu if the message has a meaningful share of Telugu script; otherwise the fallback (UI language). */
export function detectLang(text: string, fallback: Lang = "en"): Lang {
  const telugu = (text.match(TELUGU) ?? []).length;
  const letters = text.replace(/[\s\d\p{P}]/gu, "").length;
  if (letters === 0) return fallback;
  const ratio = telugu / letters;
  if (ratio >= 0.3) return "te";
  return telugu > 0 ? fallback : "en";
}

export const pickLoc = (loc: { en?: string; te?: string } | undefined, lang: Lang): string => (loc?.[lang] || loc?.en || loc?.te || "").trim();
