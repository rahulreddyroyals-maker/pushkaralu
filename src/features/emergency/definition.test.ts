import { describe, it, expect } from "vitest";
import { emergencySchema } from "./definition";

const L = (en: string) => ({ en, te: "" });
const GEO = { latitude: 17, longitude: 81.8 };
const base = { kind: "POLICE", name: L("Control room"), phone: "100", verifiedOn: "2026-01-01", verificationSource: "Phoned on site" };
const facility = { ...base, kind: "HOSPITAL", address: "Main Rd", location: GEO };

describe("emergency directory schema", () => {
  it("accepts a verified entry", () => {
    expect(emergencySchema.safeParse(base).success).toBe(true);
    expect(emergencySchema.safeParse(facility).success).toBe(true);
  });
  it("requires verification date and source (no unverified numbers)", () => {
    const { verifiedOn: _a, ...noDate } = base;
    const { verificationSource: _b, ...noSource } = base;
    void _a; void _b;
    expect(emergencySchema.safeParse(noDate).success).toBe(false);
    expect(emergencySchema.safeParse(noSource).success).toBe(false);
    expect(emergencySchema.safeParse({ ...base, verificationSource: "x" }).success).toBe(false);
  });
  it("rejects future or malformed verification dates", () => {
    expect(emergencySchema.safeParse({ ...base, verifiedOn: "2999-01-01" }).success).toBe(false);
    expect(emergencySchema.safeParse({ ...base, verifiedOn: "01/01/2026" }).success).toBe(false);
  });
  it("requires a phone and rejects junk numbers", () => {
    expect(emergencySchema.safeParse({ ...base, phone: "" }).success).toBe(false);
    expect(emergencySchema.safeParse({ ...base, phone: "call me" }).success).toBe(false);
  });
  it("facilities need an address and a location", () => {
    expect(emergencySchema.safeParse({ ...facility, location: undefined }).success).toBe(false);
    expect(emergencySchema.safeParse({ ...facility, address: undefined }).success).toBe(false);
    expect(emergencySchema.safeParse({ ...facility, kind: "PHARMACY", location: undefined }).success).toBe(false);
  });
  it("rejects unknown kinds", () => {
    expect(emergencySchema.safeParse({ ...base, kind: "TAXI" }).success).toBe(false);
  });
});
