import { describe, it, expect } from "vitest";
import { eventSlug, parseHubSlug, hubPath, hubTitle, daysUntil, describeTiming, appliesToEvent, HUB_TOPICS } from "./hub";

const ev = (id: string, canonicalPath: string, year = 2027) => ({ id, river: "GODAVARI", year, seo: { canonicalPath } });

describe("event hub slugs", () => {
  it("derives the slug from the admin canonical path, else river + year", () => {
    expect(eventSlug(ev("1", "/godavari-pushkaralu-2027"))).toBe("godavari-pushkaralu-2027");
    expect(eventSlug(ev("1", "/a/b"))).toBe("godavari-pushkaralu-2027");
    expect(eventSlug(ev("1", ""))).toBe("godavari-pushkaralu-2027");
  });
  it("builds paths", () => {
    expect(hubPath("x")).toBe("/x");
    expect(hubPath("x", "ghats")).toBe("/x-ghats");
  });
  it("parses every topic and the overview", () => {
    const events = [ev("1", "/godavari-pushkaralu-2027")];
    expect(parseHubSlug("godavari-pushkaralu-2027", events)?.view).toBe("overview");
    for (const t of HUB_TOPICS) expect(parseHubSlug(`godavari-pushkaralu-2027-${t}`, events)?.view).toBe(t);
  });
  it("rejects unknown suffixes and unknown events", () => {
    const events = [ev("1", "/godavari-pushkaralu-2027")];
    expect(parseHubSlug("godavari-pushkaralu-2027-weather", events)).toBeNull();
    expect(parseHubSlug("krishna-pushkaralu-2028", events)).toBeNull();
    expect(parseHubSlug("godavari-pushkaralu-20270", events)).toBeNull();
  });
  it("prefers the longest matching event slug", () => {
    const events = [ev("1", "/gp"), ev("2", "/gp-ghats")];
    expect(parseHubSlug("gp-ghats", events)?.event.id).toBe("2");
    expect(parseHubSlug("gp-ghats-ghats", events)?.event.id).toBe("2");
    expect(parseHubSlug("gp-dates", events)?.event.id).toBe("1");
  });
});

describe("copy and timing", () => {
  it("fills the event name", () => {
    expect(hubTitle("dates", "en", "Godavari Pushkaralu 2027")).toBe("Godavari Pushkaralu 2027 dates and schedule");
  });
  it("counts calendar days", () => {
    const now = new Date("2027-01-01T10:00:00Z");
    expect(daysUntil("2027-01-11T00:00:00Z", now)).toBe(10);
    expect(daysUntil("2026-12-31T23:00:00Z", now)).toBe(-1);
  });
  it("describes upcoming, active, ended", () => {
    const now = new Date("2027-01-05T00:00:00Z");
    expect(describeTiming("2027-01-10", "2027-01-20", now, "en")).toBe("Starts in 5 days");
    expect(describeTiming("2027-01-01", "2027-01-20", now, "en")).toBe("Under way now");
    expect(describeTiming("2026-01-01", "2026-01-20", now, "en")).toBe("Ended");
  });
  it("content applies to named or all events", () => {
    expect(appliesToEvent({}, "1")).toBe(true);
    expect(appliesToEvent({ availableForEvents: ["2"] }, "1")).toBe(false);
    expect(appliesToEvent({ availableForEvents: ["1"] }, "1")).toBe(true);
  });
});
