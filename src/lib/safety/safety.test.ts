import { describe, it, expect } from "vitest";
import { isPlausiblePhone, telHref } from "./phone";
import { haversineMeters, sortByDistance } from "./geo";
import { findSensitive, sensitiveTextError } from "@/lib/privacy/sensitive";

describe("phone", () => {
  it("accepts plausible numbers and rejects junk", () => {
    for (const ok of ["9876543210", "+91 98765 43210", "108", "040-23456789"]) expect(isPlausiblePhone(ok)).toBe(true);
    for (const bad of ["", "abc", "12", "98765 abc", "+", "1".repeat(30)]) expect(isPlausiblePhone(bad)).toBe(false);
  });
  it("builds tel: hrefs with only digits and +, null if too short", () => {
    expect(telHref("+91 98765-43210")).toBe("tel:+919876543210");
    expect(telHref("12")).toBeNull();
    expect(telHref("javascript:alert(1)")).toBeNull();
  });
});

describe("geo", () => {
  it("haversine is ~0 for the same point and ~111km per degree of latitude", () => {
    expect(haversineMeters({ latitude: 17, longitude: 81 }, { latitude: 17, longitude: 81 })).toBeLessThan(1);
    const d = haversineMeters({ latitude: 17, longitude: 81 }, { latitude: 18, longitude: 81 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_500);
  });
  it("sorts nearest first and puts items without a location last", () => {
    const items = [{ id: "far", location: { latitude: 18, longitude: 81 } }, { id: "none" }, { id: "near", location: { latitude: 17.01, longitude: 81 } }];
    const sorted = sortByDistance(items as any, { latitude: 17, longitude: 81 }) as any[];
    expect(sorted.map((x) => x.id ?? x.item?.id)).toEqual(["near", "far", "none"]);
  });
});

describe("sensitive text", () => {
  it("flags emails, links and long digit runs; allows ordinary text", () => {
    expect(findSensitive("mail me a@b.com").length).toBeGreaterThan(0);
    expect(findSensitive("visit www.example.com").length).toBeGreaterThan(0);
    expect(findSensitive("call 98765 43210").length).toBeGreaterThan(0);
    expect(findSensitive("Boy in red shirt near gate 2, age about 6")).toHaveLength(0);
    expect(sensitiveTextError("Summary", "call 9876543210")).toBeTruthy();
    expect(sensitiveTextError("Summary", "near the ghat")).toBeNull();
  });
});
