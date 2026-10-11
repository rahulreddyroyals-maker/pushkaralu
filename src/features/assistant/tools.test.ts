import { describe, it, expect } from "vitest";
import { runTool, matchesQuery, TOOL_SPECS, type ToolContext } from "./tools";
import { fakeData, NOW } from "./testkit";

const ctx = (lang: "en" | "te" = "en", data = fakeData()): ToolContext => ({ data, lang, now: NOW });
const facts = (i: { facts: { label: string; value: string }[] }) => Object.fromEntries(i.facts.map((f) => [f.label, f.value]));

describe("tool catalogue", () => {
  it("covers every capability in the brief", () => {
    const names = TOOL_SPECS.map((t) => t.name);
    for (const n of ["get_event_info", "search_ghats", "search_temples", "search_hotels", "search_purohits", "search_transport", "search_parking", "get_emergency_contacts", "search_itineraries", "search_guides"]) expect(names).toContain(n);
  });
  it("matchesQuery is an AND over tokens", () => {
    expect(matchesQuery("Kotilingala Ghat Rajahmundry", "kotilingala ghat")).toBe(true);
    expect(matchesQuery("Kotilingala Ghat", "ghat temple")).toBe(false);
    expect(matchesQuery("anything", "")).toBe(true);
  });
});

describe("ghats", () => {
  it("shows manual crowd data with timestamp and source, and 'not reported' otherwise", async () => {
    const out = await runTool("search_ghats", {}, ctx());
    const a = out.items.find((i) => i.id === "g1")!;
    const b = out.items.find((i) => i.id === "g2")!;
    expect(facts(a).Crowd).toContain("HIGH");
    expect(facts(a).Crowd).toContain("entered manually by event staff");
    expect(facts(a).Crowd).toContain("30 min ago");
    expect(facts(a)["Alternative ghat suggested"]).toBe("Pushkar Ghat");
    expect(facts(b).Crowd).toBe("Crowd not reported");
    expect(facts(b)["Open/closed"]).toBe("Open/closed status not reported");
    expect(b.asOf).toBeUndefined();
  });
  it("flags crowd data older than the staleness window", async () => {
    const stale = fakeData({ ghats: async () => [{ id: "g1", eventId: "ev1", name: { en: "X" }, description: {}, location: { latitude: 1, longitude: 1 }, facilities: [], crowdStatus: "LOW", crowdStatusUpdatedAt: "2027-07-09T00:00:00Z", crowdReported: true, operationalStatus: "OPEN", parkingInfo: {}, medicalInfo: {} }] });
    expect(facts((await runTool("search_ghats", {}, ctx("en", stale))).items[0]).Crowd).toContain("may be outdated");
  });
  it("filters by facility and name", async () => {
    expect((await runTool("search_ghats", { facility: "wheelchair_access" }, ctx())).items.map((i) => i.id)).toEqual(["g1"]);
    expect((await runTool("search_ghats", { query: "pushkar" }, ctx())).items.map((i) => i.id)).toEqual(["g2"]);
  });
  it("returns Telugu labels and names for lang=te", async () => {
    const i = (await runTool("search_ghats", {}, ctx("te"))).items[0];
    expect(i.title).toContain("(te)");
    expect(i.facts[0].label).toBe("రద్దీ");
  });
});

describe("hotels", () => {
  it("sorts by distance to a ghat and never claims availability", async () => {
    const out = await runTool("search_hotels", { nearGhatId: "g1" }, ctx());
    expect(out.items[0].id).toBe("h2");
    expect(facts(out.items[0]).Distance).toContain("straight-line");
    expect(out.items[0].note).toContain("availability is not shown");
    expect(JSON.stringify(out.items)).not.toMatch(/available now|rooms available/i);
  });
  it("shows 'not listed' rather than a zero price", async () => {
    const out = await runTool("search_hotels", {}, ctx());
    expect(facts(out.items.find((i) => i.id === "h3")!)["Listed price"]).toBe("Price not listed");
  });
  it("filters by budget and amenity, and rejects an unknown ghat id", async () => {
    expect((await runTool("search_hotels", { maxPricePerNight: 1600 }, ctx())).items.map((i) => i.id)).toEqual(["h1", "h3"]);
    expect((await runTool("search_hotels", { amenity: "elevator" }, ctx())).items.map((i) => i.id)).toEqual(["h2"]);
    const bad = await runTool("search_hotels", { nearGhatId: "nope" }, ctx());
    expect(bad.items).toEqual([]);
    expect(bad.content).toContain("search_ghats");
  });
});

describe("temples", () => {
  it("orders by proximity and labels it as a grouping, not a route", async () => {
    const out = await runTool("search_temples", { nearGhatId: "g1", suggestVisitOrder: true }, ctx());
    expect(out.items.map((i) => i.id)).toEqual(["t2", "t3", "t1"]);
    expect(out.content).toContain("not a timed route");
    expect(facts(out.items[0])["Suggested order"]).toBe("#1");
  });
  it("clamps the limit", async () => {
    expect((await runTool("search_temples", { limit: 1 }, ctx())).items).toHaveLength(1);
    expect((await runTool("search_temples", { limit: 500 }, ctx())).items.length).toBeLessThan(9);
  });
});

describe("other tools", () => {
  it("purohit pricing is quoted as the purohit's own statement", async () => {
    const i = (await runTool("search_purohits", { language: "hindi" }, ctx())).items[0];
    expect(Object.keys(facts(i))).toContain("Pricing (as stated by the purohit)");
  });
  it("transport: ON_REQUEST shows no price; event filter applies", async () => {
    const out = await runTool("search_transport", { eventId: "ev1" }, ctx());
    expect(out.items.map((i) => i.id)).toEqual(["tr1"]);
    expect(facts(out.items[0]).Fare).toContain("On request");
  });
  it("parking status carries the manual-entry note and timestamp", async () => {
    const i = (await runTool("search_parking", {}, ctx())).items[0];
    expect(facts(i)["Parking status"]).toContain("FILLING");
    expect(i.note).toContain("manually");
    expect(i.asOf).toBeTruthy();
  });
  it("emergency contacts show verification and flag old verification", async () => {
    const out = await runTool("get_emergency_contacts", {}, ctx());
    expect(facts(out.items[0]).Phone).toBe("0883-2222333");
    expect(out.items[0].note).toBeUndefined();
    expect(out.items[1].note).toContain("older than recommended");
  });
  it("itineraries filter by audience and render the day plan", async () => {
    const out = await runTool("search_itineraries", { suitableFor: "elderly" }, ctx());
    expect(out.items).toHaveLength(1);
    expect(facts(out.items[0])["Plan 1"]).toContain("05:00 Holy dip");
    expect((await runTool("search_itineraries", { suitableFor: "solo" }, ctx())).items).toHaveLength(0);
  });
  it("event info returns dates and official announcements with timestamps", async () => {
    const out = await runTool("get_event_info", {}, ctx());
    expect(out.items.map((i) => i.kind)).toEqual(["event", "announcement"]);
    expect(out.items[1].note).toContain("Official announcement");
    expect(out.items[1].asOf).toBe("2027-07-09T10:00:00Z");
  });
  it("guides search returns editorial excerpts", async () => {
    const out = await runTool("search_guides", { query: "carry water" }, ctx());
    expect(out.items[0].href).toBe("/faqs/what-to-carry");
    expect((await runTool("search_guides", { query: "zzzz" }, ctx())).items).toHaveLength(0);
  });
  it("empty results tell the model not to guess", async () => {
    expect((await runTool("search_ghats", { query: "nonexistent" }, ctx())).content).toContain("do not guess");
  });
  it("unknown tools and thrown errors become safe messages", async () => {
    expect((await runTool("drop_database", {}, ctx())).content).toContain("Unknown tool");
    const broken = fakeData({ hotels: async () => { throw new Error("secret stack detail"); } });
    const out = await runTool("search_hotels", {}, ctx("en", broken));
    expect(out.content).not.toContain("secret");
    expect(out.items).toEqual([]);
  });
});
