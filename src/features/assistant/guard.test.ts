import { describe, it, expect } from "vitest";
import { guardText, dateKeys } from "./guard";
import { splitCitations, stripCitations } from "./citations";
import { runTool } from "./tools";
import { fakeData, NOW } from "./testkit";
import type { VerifiedItem } from "./types";

async function items(...calls: [string, Record<string, unknown>][]): Promise<VerifiedItem[]> {
  const out: VerifiedItem[] = [];
  for (const [n, a] of calls) out.push(...(await runTool(n, a, { data: fakeData(), lang: "en", now: NOW })).items);
  return out;
}
const reasons = (text: string, its: VerifiedItem[]) => guardText(text, its).removed.map((r) => r.reason);

describe("guard: prices", () => {
  it("removes an invented amount, keeps a grounded one", async () => {
    const its = await items(["search_hotels", {}]);
    expect(reasons("Hotels start around ₹900 per night.", its)).toEqual(["price"]);
    expect(reasons("The hotel is listed at ₹2,000–₹3,500 per night.", its)).toEqual([]);
  });
  it("catches amounts written other ways", async () => {
    expect(reasons("Expect to pay Rs. 1200 for a taxi.", [])).toEqual(["price"]);
    expect(reasons("A taxi costs 800 rupees.", [])).toEqual(["price"]);
    expect(reasons("The fare is about 500 one way.", [])).toEqual(["price"]);
    expect(reasons("రూ. 700 అవుతుంది.", [])).toEqual(["price"]);
  });
  it("leaves non-price numbers alone", () => {
    expect(reasons("Plan two days: one for the ghat and one for temples.", [])).toEqual([]);
    expect(reasons("Carry at least 2 litres of water.", [])).toEqual([]);
  });
});

describe("guard: crowd", () => {
  it("removes crowd-level claims with no verified ghat data", () => {
    expect(reasons("The ghat is usually crowded and the queue is long, with high crowd levels.", [])).toEqual(["crowd"]);
    expect(reasons("Crowd is low at Kotilingala right now.", [])).toEqual(["crowd"]);
    expect(reasons("రద్దీ తక్కువగా ఉంది.", [])).toEqual(["crowd"]);
  });
  it("allows a crowd statement that cites a ghat with a real report", async () => {
    const its = await items(["search_ghats", {}]);
    expect(reasons("Crowd is high at [[ghat:g1]] as per staff.", its)).toEqual([]);
  });
  it("rejects a crowd statement citing a ghat that has no report", async () => {
    const its = (await items(["search_ghats", {}])).filter((i) => i.id === "g2");
    expect(reasons("Crowd is low at [[ghat:g2]].", its)).toEqual(["crowd"]);
  });
  it("allows honest 'not reported' language and generic advice", () => {
    expect(reasons("Crowd was not reported for this ghat.", [])).toEqual([]);
    expect(reasons("General guidance: avoid the busiest hours and carry water.", [])).toEqual([]);
  });
});

describe("guard: availability, dates, phones, announcements", () => {
  it("removes availability claims but keeps disclaimers", () => {
    expect(reasons("Rooms are available at Near Hotel tonight.", [])).toEqual(["availability"]);
    expect(reasons("The hotel is fully booked.", [])).toEqual(["availability"]);
    expect(reasons("Room availability is not shown, so please confirm with the hotel.", [])).toEqual([]);
  });
  it("parses dates in several styles", () => {
    expect([...dateKeys("23 July 2027, Aug 3, 2027-08-03 and 03/08/2027")].sort()).toEqual(["23-7", "3-8"]);
  });
  it("removes dates that are not in verified data and keeps grounded ones", async () => {
    const its = await items(["get_event_info", {}]);
    expect(reasons("The festival starts on 12 July.", its)).toEqual(["date"]);
    expect(reasons("The festival starts on 23 July 2027.", its)).toEqual([]);
    expect(reasons("It begins on July 23.", its)).toEqual([]);
    expect(reasons("The festival starts on 12 July.", [])).toEqual(["date"]);
  });
  it("removes phone numbers not in the directory and 'dial 108' style claims", async () => {
    const its = await items(["get_emergency_contacts", {}]);
    expect(reasons("Call 0883-2222333 for an ambulance.", its)).toEqual([]);
    expect(reasons("Call 9876543210 for help.", its)).toEqual(["phone"]);
    expect(reasons("Dial 108 for an ambulance.", its)).toEqual(["phone"]);
    expect(reasons("Dial 108 for an ambulance.", [])).toEqual(["phone"]);
  });
  it("removes announcement claims with no announcement or event data", async () => {
    expect(reasons("The government has announced a holiday for the festival.", [])).toEqual(["announcement"]);
    const its = await items(["get_event_info", {}]);
    expect(reasons("The team announced revised ghat timings.", its)).toEqual([]);
  });
  it("citation ids never trip the checks", async () => {
    const its = await items(["search_hotels", {}]);
    expect(reasons("Try [[hotel:h2]] first.", its)).toEqual([]);
  });
  it("preserves paragraph and list structure while dropping bad lines", () => {
    const r = guardText("General guidance: rest often.\n\n- Taxi costs ₹999\n- Carry an umbrella", []);
    expect(r.text).toBe("General guidance: rest often.\n\n- Carry an umbrella");
    expect(r.removed).toHaveLength(1);
  });
});

describe("citations", () => {
  it("keeps real refs, drops invented ones", async () => {
    const its = await items(["search_ghats", {}]);
    const segs = splitCitations("See [[ghat:g1]] and [[ghat:fake]] now.", its);
    expect(segs.filter((s) => s.type === "ref")).toHaveLength(1);
    expect(segs.map((s) => (s.type === "text" ? s.value : "R")).join("")).toBe("See R and  now.");
  });
  it("strips markers", () => {
    expect(stripCitations("A [[ghat:g1]] b")).toBe("A b".replace("A b", "A  b").replace("  ", " "));
  });
});
