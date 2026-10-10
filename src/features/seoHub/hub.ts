import type { SeoLang } from "@/lib/seo/paths";
import { localizedPath } from "@/lib/seo/paths";
import { slugify } from "@/lib/seo/text";

/**
 * Event hub SEO pages: /{event-slug} plus /{event-slug}-{topic}. Pure and
 * client-safe. Nothing here is event data — the slug comes from the event's
 * own admin-entered canonical path, and every figure on a hub page comes
 * from the database at render time.
 */
export const HUB_TOPICS = ["dates", "ghats", "hotels", "purohits", "rituals", "travel", "parking", "temples"] as const;
export type HubTopic = (typeof HUB_TOPICS)[number];
export type HubView = "overview" | HubTopic;

export interface HubEventRef {
  id: string;
  river: string;
  year: number;
  seo?: { canonicalPath?: string };
}

/** "/godavari-pushkaralu-2027" -> "godavari-pushkaralu-2027". Falls back to river + year when the admin left it unusable. */
export function eventSlug(event: HubEventRef): string {
  const raw = event.seo?.canonicalPath?.trim() ?? "";
  const segments = raw.split("/").filter(Boolean);
  if (segments.length === 1) {
    const s = slugify(segments[0]);
    if (s) return s;
  }
  return slugify(`${event.river}-pushkaralu-${event.year}`);
}

export function hubPath(slug: string, view: HubView = "overview"): string {
  return view === "overview" ? `/${slug}` : `/${slug}-${view}`;
}

export function hubUrlPath(slug: string, view: HubView, lang: SeoLang): string {
  return localizedPath(hubPath(slug, view), lang);
}

/** Resolve a URL slug to an event + view. Longest event slug wins so "x-2027" can't shadow "x-2027-extra". */
export function parseHubSlug<E extends HubEventRef>(urlSlug: string, events: E[]): { event: E; view: HubView } | null {
  const candidates = events.map((e) => ({ e, s: eventSlug(e) })).sort((a, b) => b.s.length - a.s.length);
  for (const { e, s } of candidates) {
    if (urlSlug === s) return { event: e, view: "overview" };
    if (urlSlug.startsWith(`${s}-`)) {
      const rest = urlSlug.slice(s.length + 1);
      if ((HUB_TOPICS as readonly string[]).includes(rest)) return { event: e, view: rest as HubTopic };
    }
  }
  return null;
}

export const HUB_COPY: Record<HubView, { label: Record<SeoLang, string>; title: Record<SeoLang, string>; intro: Record<SeoLang, string> }> = {
  overview: {
    label: { en: "Overview", te: "అవలోకనం" },
    title: { en: "{event}: dates, ghats, stay and travel guide", te: "{event}: తేదీలు, ఘాట్లు, బస, ప్రయాణ గైడ్" },
    intro: { en: "Everything you need to plan a visit, in one place.", te: "సందర్శనను ప్లాన్ చేయడానికి కావలసినదంతా ఒకే చోట." },
  },
  dates: {
    label: { en: "Dates", te: "తేదీలు" },
    title: { en: "{event} dates and schedule", te: "{event} తేదీలు, షెడ్యూల్" },
    intro: { en: "When the festival starts and ends, and how long is left.", te: "ఉత్సవం ఎప్పుడు మొదలై ఎప్పుడు ముగుస్తుంది." },
  },
  ghats: {
    label: { en: "Ghats", te: "ఘాట్లు" },
    title: { en: "{event} ghats: facilities, crowd status and directions", te: "{event} ఘాట్లు: సౌకర్యాలు, రద్దీ, దారి" },
    intro: { en: "Bathing ghats with facilities and the latest crowd report from staff.", te: "సౌకర్యాలు, సిబ్బంది ఇచ్చిన తాజా రద్దీ సమాచారంతో స్నాన ఘాట్లు." },
  },
  hotels: {
    label: { en: "Hotels", te: "హోటళ్లు" },
    title: { en: "Where to stay for {event}: verified hotels", te: "{event} కోసం ఎక్కడ బస చేయాలి: ధృవీకరించిన హోటళ్లు" },
    intro: { en: "Verified stays with price ranges and amenities.", te: "ధరల శ్రేణి, సౌకర్యాలతో ధృవీకరించిన బస." },
  },
  purohits: {
    label: { en: "Purohits", te: "పురోహితులు" },
    title: { en: "Purohits for {event} rituals", te: "{event} క్రతువులకు పురోహితులు" },
    intro: { en: "Verified purohits, the languages they speak and the rituals they perform.", te: "ధృవీకరించిన పురోహితులు, వారి భాషలు, చేసే క్రతువులు." },
  },
  rituals: {
    label: { en: "Rituals", te: "క్రతువులు" },
    title: { en: "{event} rituals: what they involve and indicative costs", te: "{event} క్రతువులు: వివరాలు, సూచనాత్మక ఖర్చులు" },
    intro: { en: "Rituals pilgrims commonly perform, with what to expect.", te: "యాత్రికులు సాధారణంగా చేసే క్రతువులు, ఏమి ఆశించాలి." },
  },
  travel: {
    label: { en: "Travel", te: "ప్రయాణం" },
    title: { en: "How to reach {event}: taxis, buses and local transport", te: "{event} కు ఎలా చేరుకోవాలి: టాక్సీలు, బస్సులు, స్థానిక రవాణా" },
    intro: { en: "Transport options with fares and timetables entered by providers.", te: "ప్రొవైడర్లు ఇచ్చిన ఛార్జీలు, టైమ్‌టేబుల్‌తో రవాణా ఎంపికలు." },
  },
  parking: {
    label: { en: "Parking", te: "పార్కింగ్" },
    title: { en: "{event} parking: locations, capacity and walking distance", te: "{event} పార్కింగ్: స్థలాలు, సామర్థ్యం, నడక దూరం" },
    intro: { en: "Parking areas with the latest status staff reported.", te: "సిబ్బంది ఇచ్చిన తాజా స్థితితో పార్కింగ్ ప్రదేశాలు." },
  },
  temples: {
    label: { en: "Temples", te: "ఆలయాలు" },
    title: { en: "Temples to visit during {event}", te: "{event} సమయంలో దర్శించదగిన ఆలయాలు" },
    intro: { en: "Temple timings, history and what is nearby.", te: "ఆలయ సమయాలు, చరిత్ర, సమీప ప్రదేశాలు." },
  },
};

export function hubTitle(view: HubView, lang: SeoLang, eventName: string): string {
  return HUB_COPY[view].title[lang].replace("{event}", eventName);
}

/** Days from `now` to `target` (negative = past). Whole calendar days, UTC. */
export function daysUntil(targetIso: string, now: Date): number {
  const t = Date.parse(targetIso);
  const n = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const d = new Date(t);
  return Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - n) / 86_400_000);
}

export function describeTiming(startIso: string, endIso: string, now: Date, lang: SeoLang): string {
  const toStart = daysUntil(startIso, now);
  const toEnd = daysUntil(endIso, now);
  if (toStart > 0) return lang === "te" ? `ప్రారంభానికి ${toStart} రోజులు` : `Starts in ${toStart} day${toStart === 1 ? "" : "s"}`;
  if (toEnd >= 0) return lang === "te" ? "ప్రస్తుతం జరుగుతోంది" : "Under way now";
  return lang === "te" ? "ముగిసింది" : "Ended";
}

/** Content / FAQ applies to an event when it names it or names none (general). */
export function appliesToEvent(rec: { availableForEvents?: string[] }, eventId: string): boolean {
  const ids = rec.availableForEvents ?? [];
  return ids.length === 0 || ids.includes(eventId);
}
