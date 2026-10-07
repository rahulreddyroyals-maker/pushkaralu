import { describe, it, expect } from "vitest";
import { leadInputSchema } from "./schemas";
import { ALL_LEAD_TYPES, CATALOG_LEAD_TARGETS, CATALOG_LEAD_TYPES, LEAD_PROVIDER_TYPES, isCatalogLeadType } from "./types";
import { getCatalogDefinition } from "@/features/catalog/registry";

const base = { providerId: "abc", userContactPhone: "9000000000", message: "Need a pickup at 6am" };

describe("catalog lead targets", () => {
  it("accepts owner-managed and catalog provider types", () => {
    for (const providerType of ALL_LEAD_TYPES) expect(leadInputSchema.safeParse({ ...base, providerType }).success).toBe(true);
    expect(leadInputSchema.safeParse({ ...base, providerType: "spaceship" }).success).toBe(false);
  });

  it("keeps the two groups disjoint, so bookings/reviews (owner types only) never accept catalog targets", () => {
    for (const t of CATALOG_LEAD_TYPES) {
      expect((LEAD_PROVIDER_TYPES as readonly string[]).includes(t)).toBe(false);
      expect(isCatalogLeadType(t)).toBe(true);
    }
    expect(isCatalogLeadType("hotel")).toBe(false);
  });

  it("every catalog lead type points at a registered catalog", () => {
    for (const t of CATALOG_LEAD_TYPES) expect(getCatalogDefinition(CATALOG_LEAD_TARGETS[t].catalogKey)).toBeTruthy();
  });
});
