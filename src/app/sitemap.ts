import type { MetadataRoute } from "next";
import { ROUTES } from "@/config/app";
import { buildSitemap, type SitemapInput } from "@/lib/seo/sitemap";
import { listEvents } from "@/features/events/api";
import { listGhats } from "@/features/ghats/api";
import { CATALOG_DEFINITIONS } from "@/features/catalog/registry";
import { listCatalog } from "@/lib/catalog/server/repository";
import { listAllContent } from "@/features/content/api";
import { CONTENT_KEYS, contentPath } from "@/features/content/sections";
import { availableLangs, isIndexable } from "@/lib/content/indexing";
import { eventSlug, hubPath, HUB_TOPICS } from "@/features/seoHub/hub";
import { hubIsIndexable, loadHubData } from "@/features/seoHub/data";
import { listTemples } from "@/features/temples/api";
import { listHotels } from "@/features/hotels/api";
import { listPurohits } from "@/features/purohits/api";
import { listRituals } from "@/features/rituals/api";

// Reads Firestore, so it must not run at build time (no credentials there). Cache headers are set by the platform; crawlers fetch rarely.
export const dynamic = "force-dynamic";

const STATIC: string[] = [
  ROUTES.home, ROUTES.events, ROUTES.ghats, ROUTES.temples, ROUTES.hotels, ROUTES.purohits, ROUTES.rituals,
  ROUTES.travel, ROUTES.boats, ROUTES.restaurants, ROUTES.parking, ROUTES.tourism, ROUTES.packages, ROUTES.emergency,
  ROUTES.guides, ROUTES.about, ROUTES.contact,
  ...CONTENT_KEYS.map((k) => contentPath(k)),
];

/** One failing data source must not take the whole sitemap down — log it and carry on. */
async function safe<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[sitemap] ${label} failed`, error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const inputs: SitemapInput[] = STATIC.map((path) => ({ path, changeFrequency: "weekly", priority: path === "/" ? 1 : 0.7 }));

  const events = await safe("events", async () => (await listEvents({ pageSize: 50 })).items);

  for (const ev of events) {
    const slug = eventSlug(ev);
    inputs.push({ path: `/events/${ev.id}`, lastModified: ev.updatedAt, changeFrequency: "weekly", priority: 0.6 });
    inputs.push({ path: hubPath(slug), lastModified: ev.updatedAt, changeFrequency: "daily", priority: 0.9, langs: ["en", "te"] });
    for (const topic of HUB_TOPICS) {
      const data = await safe(`hub ${slug}-${topic}`, async () => [await loadHubData(ev, topic, "en")]);
      if (data[0] && hubIsIndexable(topic, data[0])) {
        inputs.push({ path: hubPath(slug, topic), lastModified: ev.updatedAt, changeFrequency: "daily", priority: 0.8, langs: ["en", "te"] });
      }
    }
    const ghats = await safe(`ghats ${ev.id}`, async () => (await listGhats(ev.id, { pageSize: 50 })).items);
    for (const g of ghats) inputs.push({ path: `/events/${ev.id}/ghats/${g.id}`, lastModified: g.updatedAt, changeFrequency: "daily", priority: 0.6 });
  }

  // Slug-routed CMS content: only pages that pass the thin-content / noindex / language checks.
  for (const key of CONTENT_KEYS) {
    const records = await safe(`content ${key}`, () => listAllContent(key));
    for (const r of records) {
      const langs = availableLangs(r).filter((l) => isIndexable(key, r, l));
      if (langs.length) inputs.push({ path: contentPath(key, r.slug), lastModified: r.updatedAt, changeFrequency: "monthly", priority: 0.7, langs });
    }
  }

  // Id-routed catalog details (parking, transport, restaurants, tourism, boats…). Emergency + CMS definitions are handled elsewhere/excluded.
  for (const def of CATALOG_DEFINITIONS) {
    if (def.slugRouted || def.key === "emergency-services") continue;
    const page = await safe(`catalog ${def.key}`, async () => (await listCatalog(def, { pageSize: 100, publicView: true })).items);
    for (const r of page) inputs.push({ path: `${def.publicPath}/${r.id}`, lastModified: r.updatedAt, changeFrequency: "weekly", priority: 0.5 });
  }

  const legacy: [string, string, () => Promise<{ id: string; updatedAt: string }[]>][] = [
    ["/temples", "temples", async () => (await listTemples({ pageSize: 100 })).items],
    ["/hotels", "hotels", async () => (await listHotels({ pageSize: 100 })).items],
    ["/purohits", "purohits", async () => (await listPurohits({ pageSize: 100 })).items],
    ["/rituals", "rituals", async () => (await listRituals({ pageSize: 100 })).items],
  ];
  for (const [base, label, load] of legacy) {
    for (const r of await safe(label, load)) inputs.push({ path: `${base}/${r.id}`, lastModified: r.updatedAt, changeFrequency: "weekly", priority: 0.6 });
  }

  return buildSitemap(inputs);
}
