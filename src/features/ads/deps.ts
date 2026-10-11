import "server-only";
import { createHash } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireCatalogDefinition } from "@/features/catalog/registry";
import { getCatalog, mapCatalogDoc } from "@/lib/catalog/server/repository";
import { createFirestoreRateStore } from "@/lib/rateLimitFirestore";
import { firestoreAnalyticsStore } from "@/features/analytics/firestoreStore";
import { getHotel } from "@/features/hotels/api";
import { getPurohit } from "@/features/purohits/api";
import { getBusiness } from "@/features/businesses/api";
import { getContentBySlug } from "@/features/content/api";
import type { AdData, CampaignFull, ServeDeps } from "./serve";
import type { PlacementKey } from "./placements";

const campaignDef = () => requireCatalogDefinition("ad-campaigns");
const advertiserDef = () => requireCatalogDefinition("advertisers");
const placementDef = () => requireCatalogDefinition("ad-placements");

export const firestoreAdData: AdData = {
  async campaigns(placement: PlacementKey) {
    const snap = await getAdminDb().collection("adCampaigns").where("published", "==", true).where("status", "==", "ACTIVE").where("placement", "==", placement).limit(100).get();
    return snap.docs.map(mapCatalogDoc(campaignDef())) as unknown as CampaignFull[];
  },
  async advertisers(ids) {
    const unique = [...new Set(ids)].slice(0, 100);
    if (!unique.length) return [];
    const db = getAdminDb();
    const snaps = await db.getAll(...unique.map((id) => db.collection("advertisers").doc(id)));
    return snaps.filter((s) => s.exists).map((s) => mapCatalogDoc(advertiserDef())(s)) as unknown as Awaited<ReturnType<AdData["advertisers"]>>;
  },
  async placementConfig(placement) {
    const snap = await getAdminDb().collection("adPlacements").where("placementKey", "==", placement).limit(1).get();
    if (snap.empty) return null;
    const r = mapCatalogDoc(placementDef())(snap.docs[0]);
    if (!r.published) return null; // a draft placement record is ignored: defaults apply until it is published
    return { enabled: Boolean(r.enabled), maxItems: Number(r.maxItems) || 1 };
  },
  async listing(type, id, lang) {
    if (!id) return null;
    const pickName = (n: { en?: string; te?: string } | undefined) => (n?.[lang] || n?.en || "").trim();
    if (type === "hotel") {
      const h = await getHotel(id);
      return h ? { title: pickName(h.name), subtitle: h.address, image: h.images?.[0] } : null;
    }
    if (type === "purohit") {
      const p = await getPurohit(id);
      return p ? { title: pickName(p.name), subtitle: p.languages?.join(", "), image: p.photo ?? undefined } : null;
    }
    if (type === "business") {
      const b = await getBusiness(id);
      return b ? { title: pickName(b.name), subtitle: b.address, image: b.images?.[0] } : null;
    }
    return null;
  },
  async article(slug, lang) {
    const a = await getContentBySlug("articles", slug);
    if (!a) return null;
    const pick = (l: { en?: string; te?: string } | undefined) => (l?.[lang] || l?.en || "").trim();
    return { title: pick(a.title), subtitle: pick(a.summary) || undefined, image: a.images?.[0] };
  },
  async campaignById(id) {
    const rec = await getCatalog(campaignDef(), id, { includeUnpublished: true });
    return rec as unknown as CampaignFull | null;
  },
};

export const analyticsRateStore = createFirestoreRateStore("analyticsRateLimits");

export function hashVisitorKey(ip: string): string {
  return createHash("sha256").update(`${process.env.ANALYTICS_SALT ?? process.env.AI_RATE_SALT ?? "pushkaralu"}:${ip}`).digest("hex").slice(0, 32);
}

export const clientIp = (headers: Headers): string => headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";

export function adServeDeps(): ServeDeps {
  return { data: firestoreAdData, store: firestoreAnalyticsStore, now: () => new Date(), rng: Math.random, rateStore: analyticsRateStore };
}
