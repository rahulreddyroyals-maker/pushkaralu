import "server-only";
import { cache } from "react";
import { listEvents } from "@/features/events/api";
import { listGhats } from "@/features/ghats/api";
import { listHotels } from "@/features/hotels/api";
import { listPurohits } from "@/features/purohits/api";
import { listRituals } from "@/features/rituals/api";
import { listTemples } from "@/features/temples/api";
import { loadPublicList } from "@/features/catalog/publicApi";
import { listContent } from "@/features/content/api";
import { hasLanguage, pickLang } from "@/lib/content/indexing";
import type { SeoLang } from "@/lib/seo/paths";
import type { PushkaraluEvent } from "@/types/domain";
import { appliesToEvent, parseHubSlug, type HubView } from "./hub";
import type { ContentRecord } from "@/features/content/definitions";

export interface HubItem {
  id: string;
  name: string;
  href: string;
  detail?: string;
}

export interface HubData {
  items: HubItem[];
  /** Admin-written articles/guides that apply to this event and topic. */
  reading: { title: string; slug: string; kind: "articles" | "pilgrim-guides" }[];
  faqs: { question: string; answer: string; slug: string }[];
}

/** Published events, deduplicated per request (metadata + page both need it). */
export const loadHubEvents = cache(async (): Promise<PushkaraluEvent[]> => (await listEvents({ pageSize: 50 })).items);

export async function resolveHub(urlSlug: string) {
  return parseHubSlug<PushkaraluEvent>(urlSlug, await loadHubEvents());
}

type Named = { name?: { en?: string; te?: string } };
const nm = (r: Named, lang: SeoLang) => (r.name?.[lang] || r.name?.en || "").trim();

export async function loadHubData(event: PushkaraluEvent, view: HubView, lang: SeoLang): Promise<HubData> {
  const items = await loadItems(event, view, lang);

  const [articles, guides, faqs] = await Promise.all([
    listContent("articles", { pageSize: 30 }),
    listContent("pilgrim-guides", { pageSize: 30 }),
    listContent("faqs", { pageSize: 50 }),
  ]);
  const matchesTopic = (r: ContentRecord) => view === "overview" || r.topic === view;
  const usable = (r: ContentRecord) => appliesToEvent(r, event.id) && matchesTopic(r) && hasLanguage(r, lang);

  return {
    items,
    reading: [
      ...articles.items.filter(usable).map((r) => ({ title: pickLang(r.title, lang), slug: r.slug, kind: "articles" as const })),
      ...guides.items.filter(usable).map((r) => ({ title: pickLang(r.title, lang), slug: r.slug, kind: "pilgrim-guides" as const })),
    ].slice(0, 6),
    faqs: faqs.items.filter(usable).slice(0, view === "overview" ? 6 : 10).map((r) => ({ question: pickLang(r.title, lang), answer: pickLang(r.body, lang), slug: r.slug })),
  };
}

async function loadItems(event: PushkaraluEvent, view: HubView, lang: SeoLang): Promise<HubItem[]> {
  switch (view) {
    case "ghats": {
      const { items } = await listGhats(event.id, { pageSize: 30 });
      return items.map((g) => ({ id: g.id, name: nm(g, lang), href: `/events/${event.id}/ghats/${g.id}`, detail: g.facilities.length ? `${g.facilities.length} facilities listed` : undefined }));
    }
    case "hotels": {
      const { items } = await listHotels({ pageSize: 12 });
      return items.map((h) => ({ id: h.id, name: nm(h, lang), href: `/hotels/${h.id}`, detail: h.priceRangeMax > 0 ? `₹${h.priceRangeMin}–₹${h.priceRangeMax} per night` : undefined }));
    }
    case "purohits": {
      const { items } = await listPurohits({ pageSize: 12 });
      return items.map((p) => ({ id: p.id, name: nm(p, lang), href: `/purohits/${p.id}`, detail: p.languages?.length ? p.languages.join(", ") : undefined }));
    }
    case "rituals": {
      const { items } = await listRituals({ pageSize: 24 });
      return items.map((r) => ({ id: r.id, name: nm(r, lang), href: `/rituals/${r.id}`, detail: r.indicativePriceMax > 0 ? `Indicative ₹${r.indicativePriceMin}–₹${r.indicativePriceMax}` : undefined }));
    }
    case "temples": {
      const { items } = await listTemples({ pageSize: 20 });
      return items.map((t) => ({ id: t.id, name: nm(t, lang), href: `/temples/${t.id}` }));
    }
    case "travel": {
      const { items } = await loadPublicList("transport", { pageSize: 30 });
      return items.filter((r) => appliesToEvent(r as { availableForEvents?: string[] }, event.id)).map((r) => ({ id: r.id, name: nm(r as Named, lang), href: `/travel/${r.id}` }));
    }
    case "parking": {
      const { items } = await loadPublicList("parking", { pageSize: 30 });
      return items.filter((r) => appliesToEvent(r as { availableForEvents?: string[] }, event.id)).map((r) => ({
        id: r.id, name: nm(r as Named, lang), href: `/parking/${r.id}`,
        detail: typeof r.capacity === "number" ? `Capacity ${r.capacity} vehicles` : undefined,
      }));
    }
    default:
      return [];
  }
}

const LIST_VIEWS: HubView[] = ["ghats", "hotels", "purohits", "rituals", "travel", "parking", "temples"];

/** A hub page is worth indexing when it has something real to show: a list, admin-written reading, or it is the overview/dates page. */
export function hubIsIndexable(view: HubView, data: HubData): boolean {
  if (view === "overview" || view === "dates") return true;
  if (!LIST_VIEWS.includes(view)) return false;
  return data.items.length > 0 || data.reading.length > 0;
}
