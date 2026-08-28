import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { timestampToIso } from "./pagination";

describe("timestampToIso", () => {
  it("converts a Firestore Timestamp to an ISO string", () => {
    const ts = Timestamp.fromDate(new Date("2027-04-14T00:00:00.000Z"));
    expect(timestampToIso(ts)).toBe("2027-04-14T00:00:00.000Z");
  });

  it("passes through an already-string value unchanged", () => {
    expect(timestampToIso("2027-01-01T00:00:00.000Z")).toBe("2027-01-01T00:00:00.000Z");
  });

  it("falls back to epoch for a missing/undefined value rather than throwing", () => {
    expect(timestampToIso(undefined)).toBe(new Date(0).toISOString());
  });
});
