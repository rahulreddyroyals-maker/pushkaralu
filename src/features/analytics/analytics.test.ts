import { describe, it, expect } from "vitest";
import { ingest, INGEST_REQUESTS_PER_MINUTE, type IngestDeps } from "./ingest";
import { createMemoryAnalyticsStore } from "./store";
import { createMemoryRateStore } from "@/lib/rateLimit";
import { adminReport, providerReport, type ReportData, type ReportDeps, type BookingFact } from "./reports";

const NOW = new Date("2026-10-10T06:00:00Z");
const UA = "Mozilla/5.0 Safari";
function setup() {
  const store = createMemoryAnalyticsStore();
  const deps: IngestDeps = { store, rateStore: createMemoryRateStore(), now: () => NOW, shard: () => 0 };
  return { store, deps };
}

describe("ingest", () => {
  it("counts a page view and entity view", async () => {
    const { deps, store } = setup();
    const r = await ingest(deps, "v", UA, { events: [{ type: "page_view", path: "/hotels/h1", first: true }] });
    expect(r).toMatchObject({ ok: true, status: 202, data: { accepted: 2 } });
    expect([...store.rows.values()].map((x) => x.type).sort()).toEqual(["entity_view", "page_view"]);
  });
  it("drops bots silently", async () => {
    const { deps, store } = setup();
    expect(await ingest(deps, "v", "Googlebot", { events: [{ type: "app_open", path: "/" }] })).toMatchObject({ ok: true, data: { accepted: 0 } });
    expect(store.rows.size).toBe(0);
  });
  it("rejects malformed bodies and rate-limits a visitor", async () => {
    const { deps } = setup();
    expect(await ingest(deps, "v", UA, { nope: 1 })).toMatchObject({ ok: false, status: 400 });
    for (let i = 0; i < INGEST_REQUESTS_PER_MINUTE; i++) await ingest(deps, "v", UA, { events: [{ type: "app_open", path: "/" }] });
    expect(await ingest(deps, "v", UA, { events: [{ type: "app_open", path: "/" }] })).toMatchObject({ ok: false, status: 429 });
  });
  it("stores nothing that identifies the visitor", async () => {
    const { deps, store } = setup();
    await ingest(deps, "visitor-secret-key", UA, { events: [{ type: "search", path: "/", term: "boats" }] });
    expect(JSON.stringify([...store.rows.values()])).not.toContain("visitor-secret-key");
  });
  it("does not store private-area views", async () => {
    const { deps, store } = setup();
    await ingest(deps, "v", UA, { events: [{ type: "page_view", path: "/admin/analytics", first: true }] });
    expect(store.rows.size).toBe(0);
  });
});

const booking = (p: Partial<BookingFact>): BookingFact => ({ providerId: "h1", providerType: "hotel", status: "CONFIRMED", amount: 1000, commissionAmount: 100, providerPayout: 900, createdAt: "2026-10-09T05:00:00Z", ...p });

function reportSetup() {
  const { store, deps: ing } = setup();
  const data: ReportData = {
    async bookingsInRange() { return [booking({}), booking({ status: "PENDING", amount: 500 }), booking({ providerId: "other", amount: 7777 })]; },
    async ownedListings(uid) { return uid === "owner1" ? [{ type: "hotel", id: "h1", name: "Hotel One" }] : []; },
    async bookingsForOwner(uid) { return uid === "owner1" ? [booking({}), booking({ status: "PENDING", amount: 500 })] : []; },
    async leadsForListings(ids) { return ids.includes("h1") ? [{ providerId: "h1", createdAt: "2026-10-09T05:00:00Z" }, { providerId: "h1", createdAt: "2025-01-01T00:00:00Z" }] : []; },
    async allCampaigns() { return [{ id: "c1", title: "Camp", published: true, advertiserId: "a1", format: "BANNER", placement: "listings_top", status: "ACTIVE", startDate: "2026-10-01", endDate: "2026-10-31", budgetInr: 100, pricingModel: "CPC", rateInr: 10, weight: 5 }]; },
    async advertisers() { return [{ id: "a1", name: "Acme", published: true, status: "ACTIVE" }]; },
    async advertisersForOwner(uid) { return uid === "owner1" ? [{ id: "a1", name: "Acme", published: true, status: "ACTIVE", ownerUid: "owner1" }] : []; },
    async campaignsForAdvertisers(ids) { return ids.includes("a1") ? (await this.allCampaigns(1)) : []; },
  };
  const deps: ReportDeps = { store, data, now: () => NOW };
  return { ing, store, deps };
}

describe("reports", () => {
  it("admin report summarises traffic, bookings and campaigns", async () => {
    const { ing, deps } = reportSetup();
    await ingest(ing, "v", UA, { events: [{ type: "page_view", path: "/hotels/h1", first: true }, { type: "page_view", path: "/purohits/p1", first: true }] });
    const r = await adminReport(deps, 7);
    expect(r.metrics).toMatchObject({ pageViews: 2, hotelViews: 1, purohitViews: 1 });
    expect(r.bookings).toMatchObject({ count: 3, realized: 2, revenueInr: 8777 });
    expect(r.campaigns[0]).toMatchObject({ id: "c1", status: "ACTIVE", advertiser: "Acme" });
  });
  it("provider report only contains the owner's listings, bookings and leads", async () => {
    const { ing, deps } = reportSetup();
    await ingest(ing, "v", UA, { events: [
      { type: "page_view", path: "/hotels/h1", first: true }, { type: "page_view", path: "/hotels/h2", first: true },
      { type: "click", path: "/hotels/h1", action: "call" }, { type: "inquiry_start", path: "/hotels/h1", first: true },
    ] });
    const r = await providerReport(deps, "owner1", 30);
    expect(r.listings).toHaveLength(1);
    expect(r.listings[0]).toMatchObject({ id: "h1", leads: 1, bookings: 2, revenueInr: 1000 });
    expect(r.listings[0].stats).toMatchObject({ views: 1, totalClicks: 1, inquiryStarts: 1 });
    expect(r.totals).toMatchObject({ views: 1, leads: 1, bookings: 2 });
    expect(r.campaigns).toHaveLength(1);
  });
  it("a user with no listings sees nothing, not the platform's numbers", async () => {
    const { ing, deps } = reportSetup();
    await ingest(ing, "v", UA, { events: [{ type: "page_view", path: "/hotels/h1", first: true }] });
    const r = await providerReport(deps, "stranger", 30);
    expect(r.listings).toEqual([]);
    expect(r.totals).toEqual({ views: 0, clicks: 0, inquiryStarts: 0, leads: 0, bookings: 0, revenueInr: 0 });
    expect(r.campaigns).toEqual([]);
  });
  it("report contains no visitor or customer identity fields", async () => {
    const { deps } = reportSetup();
    const json = JSON.stringify([await adminReport(deps, 7), await providerReport(deps, "owner1", 7)]);
    for (const k of ["userId", "userContactPhone", "userDisplayName", "contactEmail", "ownerUid"]) expect(json).not.toContain(k);
  });
});
