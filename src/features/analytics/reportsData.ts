import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { timestampToIso } from "@/lib/pagination";
import { requireCatalogDefinition } from "@/features/catalog/registry";
import { mapCatalogDoc } from "@/lib/catalog/server/repository";
import { listHotels } from "@/features/hotels/api";
import { listPurohits } from "@/features/purohits/api";
import { listBusinesses } from "@/features/businesses/api";
import { firestoreAnalyticsStore } from "./firestoreStore";
import type { AdvertiserReportRec, BookingFact, CampaignReportRec, ReportData, ReportDeps } from "./reports";
import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";

const toBooking = (d: QueryDocumentSnapshot<DocumentData>): BookingFact => {
  const x = d.data();
  return { providerId: x.providerId, providerType: x.providerType, status: x.status ?? "PENDING", amount: x.amount ?? 0, commissionAmount: x.commissionAmount ?? 0, providerPayout: x.providerPayout ?? 0, createdAt: timestampToIso(x.createdAt) };
};
const adv = () => requireCatalogDefinition("advertisers");
const camp = () => requireCatalogDefinition("ad-campaigns");
const loc = (v: unknown) => ((v as { en?: string } | undefined)?.en ?? "");
const toCampaign = (d: QueryDocumentSnapshot<DocumentData>): CampaignReportRec => { const r = mapCatalogDoc(camp())(d) as Record<string, unknown>; return { ...(r as unknown as CampaignReportRec), title: loc(r.title) }; };
const toAdvertiser = (d: QueryDocumentSnapshot<DocumentData>): AdvertiserReportRec => { const r = mapCatalogDoc(adv())(d) as Record<string, unknown>; return { ...(r as unknown as AdvertiserReportRec), name: loc(r.name) }; };
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export const firestoreReportData: ReportData = {
  async bookingsInRange(from, to, cap) {
    const s = await getAdminDb().collection("bookings").where("createdAt", ">=", from).where("createdAt", "<", to).limit(cap).get();
    return s.docs.map(toBooking);
  },
  async ownedListings(uid) {
    const [h, p, b] = await Promise.all([listHotels({ ownerId: uid, includeUnverified: true, pageSize: 50 }), listPurohits({ ownerId: uid, includeUnverified: true, pageSize: 50 }), listBusinesses({ ownerId: uid, includeUnverified: true, pageSize: 50 })]);
    return [
      ...h.items.map((x) => ({ type: "hotel" as const, id: x.id, name: x.name.en })),
      ...p.items.map((x) => ({ type: "purohit" as const, id: x.id, name: x.name.en })),
      ...b.items.map((x) => ({ type: "business" as const, id: x.id, name: x.name.en })),
    ];
  },
  async bookingsForOwner(uid, cap) {
    // Equality-only query (no composite index); date filtering happens in the report.
    const s = await getAdminDb().collection("bookings").where("providerOwnerId", "==", uid).limit(cap).get();
    return s.docs.map(toBooking);
  },
  async leadsForListings(ids, cap) {
    const out: { providerId: string; createdAt: string }[] = [];
    for (const part of chunk(ids, 30)) {
      const s = await getAdminDb().collection("leads").where("providerId", "in", part).limit(cap).get();
      out.push(...s.docs.map((d) => ({ providerId: d.data().providerId as string, createdAt: timestampToIso(d.data().createdAt) })));
    }
    return out;
  },
  async allCampaigns(cap) { return (await getAdminDb().collection("adCampaigns").limit(cap).get()).docs.map(toCampaign); },
  async advertisers(ids) {
    const db = getAdminDb();
    if (ids) { if (!ids.length) return []; return (await db.getAll(...ids.map((i) => db.collection("advertisers").doc(i)))).filter((s) => s.exists).map((s) => toAdvertiser(s as QueryDocumentSnapshot<DocumentData>)); }
    return (await db.collection("advertisers").limit(500).get()).docs.map(toAdvertiser);
  },
  async advertisersForOwner(uid) {
    if (!uid) return [];
    return (await getAdminDb().collection("advertisers").where("ownerUid", "==", uid).limit(20).get()).docs.map(toAdvertiser);
  },
  async campaignsForAdvertisers(ids) {
    const out: CampaignReportRec[] = [];
    for (const part of chunk(ids, 30)) out.push(...(await getAdminDb().collection("adCampaigns").where("advertiserId", "in", part).limit(200).get()).docs.map(toCampaign));
    return out;
  },
};

export const reportDeps = (): ReportDeps => ({ store: firestoreAnalyticsStore, data: firestoreReportData, now: () => new Date() });
