import { absoluteUrl } from "./site";

/** schema.org JSON-LD builders. Plain objects in, plain objects out; no I/O. */
export type JsonLd = Record<string, unknown>;

export interface Crumb {
  name: string;
  /** Site path; omit for the current (last) page. */
  path?: string;
}

/** Drop undefined / empty values so the markup never carries blank properties. */
export function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean).filter((v) => v !== undefined) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined || v === null || v === "") continue;
      const c = clean(v);
      if (Array.isArray(c) && c.length === 0) continue;
      out[k] = c;
    }
    return out as T;
  }
  return value;
}

/** Serialise for a <script type="application/ld+json">. Escapes "<" so content can never close the script tag. */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(new RegExp("\u2028", "g"), "\\u2028")
    .replace(new RegExp("\u2029", "g"), "\\u2029");
}

export function breadcrumbList(crumbs: Crumb[], siteUrl?: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) =>
      clean({ "@type": "ListItem", position: i + 1, name: c.name, item: c.path ? absoluteUrl(c.path, siteUrl) : undefined })
    ),
  };
}

export function faqPage(items: { question: string; answer: string }[]): JsonLd | null {
  const valid = items.filter((i) => i.question.trim() && i.answer.trim());
  if (valid.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

export interface ArticleLdInput {
  headline: string;
  description?: string;
  path: string;
  lang: "en" | "te";
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}

export function article(input: ArticleLdInput, siteUrl?: string): JsonLd {
  const url = absoluteUrl(input.path, siteUrl);
  return clean({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline.slice(0, 110),
    description: input.description,
    inLanguage: input.lang === "te" ? "te-IN" : "en-IN",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: input.image ? [absoluteUrl(input.image, siteUrl)] : undefined,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { "@type": "Organization", name: input.authorName ?? "Pushkaralu" },
    publisher: { "@type": "Organization", name: "Pushkaralu" },
  });
}

export interface EventLdInput {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  path: string;
  image?: string;
  /** Free-text place (e.g. "Rajahmundry, Andhra Pradesh") — only emitted when an admin supplied one. */
  locationName?: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
}

export function event(input: EventLdInput, siteUrl?: string): JsonLd {
  return clean({
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.name,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: absoluteUrl(input.path, siteUrl),
    image: input.image ? [absoluteUrl(input.image, siteUrl)] : undefined,
    location: input.locationName ? { "@type": "Place", name: input.locationName, address: input.locationName } : undefined,
  });
}

export function itemList(name: string, items: { name: string; path: string }[], siteUrl?: string): JsonLd | null {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: absoluteUrl(it.path, siteUrl) })),
  };
}

export function webSite(name: string, siteUrl?: string): JsonLd {
  return { "@context": "https://schema.org", "@type": "WebSite", name, url: absoluteUrl("/", siteUrl) };
}

export function organization(name: string, siteUrl?: string, logoPath?: string): JsonLd {
  return clean({
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: absoluteUrl("/", siteUrl),
    logo: logoPath ? absoluteUrl(logoPath, siteUrl) : undefined,
  });
}
