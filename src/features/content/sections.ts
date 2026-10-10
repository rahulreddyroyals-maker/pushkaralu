import type { ContentKey } from "@/lib/content/indexing";
import type { SeoLang } from "@/lib/seo/paths";

/** Public sections of the content engine. Client-safe (no server imports). */
export interface ContentSection {
  key: ContentKey;
  path: string;
  label: Record<SeoLang, string>;
  intro: Record<SeoLang, string>;
  ldType: "Article" | "FAQ" | "WebPage";
}

export const CONTENT_SECTIONS: Record<ContentKey, ContentSection> = {
  articles: {
    key: "articles", path: "/articles", ldType: "Article",
    label: { en: "Articles", te: "వ్యాసాలు" },
    intro: { en: "Practical reading for planning your Pushkaralu visit.", te: "పుష్కరాల సందర్శనకు ఉపయోగపడే వ్యాసాలు." },
  },
  "pilgrim-guides": {
    key: "pilgrim-guides", path: "/pilgrim-guides", ldType: "Article",
    label: { en: "Pilgrim guides", te: "యాత్రికుల గైడ్లు" },
    intro: { en: "Step-by-step guides for pilgrims and families.", te: "యాత్రికులు, కుటుంబాల కోసం దశలవారీ గైడ్లు." },
  },
  faqs: {
    key: "faqs", path: "/faqs", ldType: "FAQ",
    label: { en: "FAQs", te: "తరచుగా అడిగే ప్రశ్నలు" },
    intro: { en: "Quick answers to common questions.", te: "సాధారణ ప్రశ్నలకు త్వరిత సమాధానాలు." },
  },
  "location-pages": {
    key: "location-pages", path: "/locations", ldType: "WebPage",
    label: { en: "Locations", te: "ప్రదేశాలు" },
    intro: { en: "Places to know before you travel.", te: "ప్రయాణానికి ముందు తెలుసుకోవలసిన ప్రదేశాలు." },
  },
  "service-pages": {
    key: "service-pages", path: "/services", ldType: "WebPage",
    label: { en: "Services", te: "సేవలు" },
    intro: { en: "What is available and how to use it.", te: "అందుబాటులో ఉన్న సేవలు, ఎలా ఉపయోగించుకోవాలి." },
  },
};

export const CONTENT_KEYS = Object.keys(CONTENT_SECTIONS) as ContentKey[];

export function contentPath(key: ContentKey, slug?: string): string {
  const base = CONTENT_SECTIONS[key].path;
  return slug ? `${base}/${slug}` : base;
}
