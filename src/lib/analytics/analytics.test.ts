import { describe, it, expect } from "vitest";
import { classifyPath, isBot, isTrackablePath, normalizePath, resolveEvent, sanitizeSearchTerm, batchSchema } from "./events";
import { dayKey, parseRange, rangeBounds, rangeKeys } from "./days";
import { dailySeries, entityStats, platformMetrics, popularLocations, popularServices, ratio, type AggRow } from "./summarize";

const row = (p: Partial<AggRow>): AggRow => ({ day: "2026-10-01", type: "page_view", entityType: "page", entityId: "/", action: "", label: "", count: 1, uniques: 1, ...p });

describe("path handling", () => {
  it("never tracks private areas", () => {
    for (const p of ["/admin", "/admin/analytics", "/provider/analytics", "/te/profile", "/login", "/api/x", "/r/ad/abc", "/bookings"]) expect(isTrackablePath(p)).toBe(false);
    expect(isTrackablePath("/hotels/abc")).toBe(true);
    expect(isTrackablePath("/te/hotels")).toBe(true);
  });
  it("classifies detail pages and ignores lists", () => {
    expect(classifyPath("/hotels/h1")).toEqual({ entityType: "hotel", entityId: "h1" });
    expect(classifyPath("/te/purohits/p9?x=1")).toEqual({ entityType: "purohit", entityId: "p9" });
    expect(classifyPath("/hotels")).toBeNull();
    expect(classifyPath("/")).toBeNull();
  });
  it("collapses id-like segments so page_view cardinality stays bounded", () => {
    expect(normalizePath("/hotels/ABCDEFGHIJ1234567890?x=1")).toBe("/hotels/[id]");
  });
  it("detects bots and missing user agents", () => {
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone) Safari")).toBe(false);
  });
});

describe("sanitizeSearchTerm", () => {
  it("drops personal data", () => {
    expect(sanitizeSearchTerm("me@example.com")).toBeNull();
    expect(sanitizeSearchTerm("call 98765 43210")).toBeNull();
    expect(sanitizeSearchTerm("a")).toBeNull();
    expect(sanitizeSearchTerm("  Hotels   Near Ghat ")).toBe("hotels near ghat");
  });
});

describe("resolveEvent", () => {
  it("a detail page view yields page_view and entity_view", () => {
    const out = resolveEvent({ type: "page_view", path: "/hotels/h1", label: "Grand | Pushkaralu", first: true });
    expect(out.map((e) => e.type)).toEqual(["page_view", "entity_view"]);
    expect(out[1]).toMatchObject({ entityType: "hotel", entityId: "h1", label: "Grand", first: true });
  });
  it("counts nothing for untracked paths", () => {
    expect(resolveEvent({ type: "page_view", path: "/admin/hotels", first: true })).toEqual([]);
    expect(resolveEvent({ type: "click", path: "/provider", action: "call", first: false })).toEqual([]);
  });
  it("an entity view cannot be claimed for an arbitrary id (derived from the path)", () => {
    expect(resolveEvent({ type: "entity_view", path: "/hotels", first: true })).toEqual([]);
  });
  it("search events keep sanitized terms only", () => {
    expect(resolveEvent({ type: "search", path: "/", term: "x@y.com", first: false })).toEqual([]);
    expect(resolveEvent({ type: "search", path: "/", term: "boats", first: false })[0]).toMatchObject({ type: "search", entityId: "boats" });
  });
  it("ad events require a well-formed campaign id", () => {
    expect(resolveEvent({ type: "ad_impression", path: "/", campaignId: "../etc", first: true })).toEqual([]);
    expect(resolveEvent({ type: "ad_impression", path: "/", campaignId: "camp_1234", first: true })).toHaveLength(1);
  });
  it("batch size is capped", () => {
    expect(batchSchema.safeParse({ events: [] }).success).toBe(false);
    expect(batchSchema.safeParse({ events: Array.from({ length: 21 }, () => ({ type: "app_open" })) }).success).toBe(false);
  });
});

describe("days", () => {
  it("uses India calendar days", () => {
    expect(dayKey(new Date("2026-10-01T19:00:00Z"))).toBe("2026-10-02"); // 00:30 IST next day
  });
  it("builds inclusive ranges and bounds", () => {
    const keys = rangeKeys(7, new Date("2026-10-10T06:00:00Z"));
    expect(keys).toHaveLength(7);
    expect(keys[6]).toBe("2026-10-10");
    const b = rangeBounds(keys);
    expect(b.to.getTime() - b.from.getTime()).toBe(7 * 86_400_000);
  });
  it("falls back to 30 on a bad range", () => {
    expect(parseRange("9999")).toBe(30);
    expect(parseRange("7")).toBe(7);
  });
});

describe("summaries", () => {
  const rows = [
    row({ type: "page_view", count: 10, uniques: 6 }),
    row({ type: "entity_view", entityType: "hotel", entityId: "h1", label: "Hotel One", count: 5 }),
    row({ type: "entity_view", entityType: "ghat", entityId: "g1", label: "Ghat", count: 9 }),
    row({ type: "click", entityType: "hotel", entityId: "h1", action: "call", count: 2 }),
    row({ type: "inquiry_start", entityType: "hotel", entityId: "h1", count: 1 }),
    row({ type: "share", action: "whatsapp", count: 3 }),
  ];
  it("computes platform metrics", () => {
    const m = platformMetrics(rows);
    expect(m).toMatchObject({ pageViews: 10, uniquePageViews: 6, hotelViews: 5, hotelClicks: 2, providerViews: 5, shares: 3, inquiryStarts: 1 });
  });
  it("separates locations from services", () => {
    expect(popularLocations(rows).map((i) => i.entityId)).toEqual(["g1"]);
    expect(popularServices(rows).map((i) => i.entityId)).toEqual(["h1"]);
  });
  it("scopes entity stats to one listing", () => {
    const s = entityStats(rows, "hotel", "h1", ["2026-10-01", "2026-10-02"]);
    expect(s).toMatchObject({ views: 5, totalClicks: 2, inquiryStarts: 1 });
    expect(s.series).toEqual([{ day: "2026-10-01", value: 5 }, { day: "2026-10-02", value: 0 }]);
    expect(entityStats(rows, "hotel", "other", ["2026-10-01"]).views).toBe(0);
  });
  it("fills empty days and guards divide-by-zero", () => {
    expect(dailySeries([], ["a", "b"], () => true)).toEqual([{ day: "a", value: 0 }, { day: "b", value: 0 }]);
    expect(ratio(1, 0)).toBeNull();
    expect(ratio(1, 3)).toBe(33.33);
  });
});
