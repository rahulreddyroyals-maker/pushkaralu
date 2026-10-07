import { describe, it, expect } from "vitest";
import { directionsUrl, formatDistance, formatDuration, formatInr, formatRelativeTime, isStale, pick } from "./format";

const now = new Date("2026-10-07T10:00:00Z");

describe("formatRelativeTime", () => {
  it("renders minutes, hours and days", () => {
    expect(formatRelativeTime("2026-10-07T09:50:00Z", now)).toBe("10 minutes ago");
    expect(formatRelativeTime("2026-10-07T09:59:40Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-10-07T09:00:00Z", now)).toBe("1 hour ago");
    expect(formatRelativeTime("2026-10-04T10:00:00Z", now)).toBe("3 days ago");
  });
  it("returns null for missing or epoch-zero timestamps rather than a bogus age", () => {
    expect(formatRelativeTime(undefined, now)).toBeNull();
    expect(formatRelativeTime("1970-01-01T00:00:00.000Z", now)).toBeNull();
    expect(formatRelativeTime("garbage", now)).toBeNull();
  });
});

describe("isStale", () => {
  it("is stale past the threshold and when the timestamp is missing", () => {
    expect(isStale("2026-10-07T03:00:00Z", 6, now)).toBe(true);
    expect(isStale("2026-10-07T05:00:00Z", 6, now)).toBe(false);
    expect(isStale(undefined, 6, now)).toBe(true);
  });
});

describe("formatters", () => {
  it("formats distance, duration and rupees", () => {
    expect(formatDistance(450)).toBe("450 m");
    expect(formatDistance(1500)).toBe("1.5 km");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatInr(125000)).toBe("₹1,25,000");
  });
  it("builds a keyless directions URL from coordinates", () => {
    expect(directionsUrl({ latitude: 16.99, longitude: 81.78 })).toBe("https://www.google.com/maps/dir/?api=1&destination=16.99,81.78");
  });
  it("picks a locale with English fallback", () => {
    expect(pick({ en: "Ghat", te: "ఘాట్" }, "te")).toBe("ఘాట్");
    expect(pick({ en: "Ghat", te: "" }, "te")).toBe("Ghat");
    expect(pick(undefined)).toBe("");
  });
});
