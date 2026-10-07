import { describe, it, expect } from "vitest";
import { CATALOG_DEFINITIONS, getCatalogDefinition, requireCatalogDefinition } from "./registry";
import type { CatalogDefinition, FieldDescriptor } from "@/lib/catalog/types";
import { cardFor, priceText, type CatalogItem } from "./cards";

const L = (en: string) => ({ en, te: `${en} (te)` });
const SEO = { title: L("t"), description: L("d") };
const GEO = { latitude: 16.99, longitude: 81.78 };

/** One minimal-valid payload per catalog — the contract the admin form must be able to satisfy. */
const VALID: Record<string, Record<string, unknown>> = {
  transport: { kind: "taxi", name: L("Demo Taxi"), description: L("d"), location: GEO, address: "Station Rd", pricingModel: "FIXED", amountInr: 500, contactPhone: "9000000000", seo: SEO },
  "boat-operators": { name: L("Demo Operator"), description: L("d"), address: "Jetty", location: GEO, contactPhone: "9000000000", seo: SEO },
  boats: { operatorId: "op1", name: L("Demo Boat"), boatType: "motor_boat", capacity: 20, status: "ACTIVE", seo: SEO },
  "boat-routes": {
    operatorId: "op1", title: L("Sunset ride"), description: L("d"), startPointName: "Main jetty", startLocation: GEO, durationMinutes: 60,
    safetyInfo: L("Wear life jackets"), schedules: [{ days: ["MON", "TUE"], departureTime: "17:30" }], seo: SEO,
  },
  parking: { name: L("Demo Parking"), address: "Near ghat", location: GEO, parkingType: "open_ground", vehicleTypes: ["car"], capacity: 100, status: "OPEN", seo: SEO },
  restaurants: { name: L("Demo Meals"), description: L("d"), address: "Main Rd", location: GEO, dietType: "PURE_VEG", priceCategory: "BUDGET", seo: SEO },
  tourism: { kind: "TEMPLE", name: L("Demo Temple"), description: L("d"), address: "Hill", location: GEO, seo: SEO },
  itineraries: {
    title: L("One day"), summary: L("s"), durationDays: 1, seo: SEO,
    days: [{ title: L("Day"), stops: [{ title: L("Stop"), time: "09:00" }] }],
  },
  packages: { title: L("Pkg"), summary: L("s"), description: L("d"), durationDays: 2, nights: 1, seo: SEO },
};

function walk(fields: FieldDescriptor[], visit: (f: FieldDescriptor) => void) {
  for (const f of fields) {
    visit(f);
    if (f.type === "list") walk(f.fields, visit);
  }
}

describe("catalog registry", () => {
  it("has unique keys and collections, and resolves every key", () => {
    const keys = CATALOG_DEFINITIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(CATALOG_DEFINITIONS.map((d) => d.collection)).size).toBe(keys.length);
    for (const key of keys) expect(getCatalogDefinition(key)).toBeTruthy();
    expect(getCatalogDefinition("nope")).toBeUndefined();
  });

  it("covers all nine Sprint 6 catalogs", () => {
    expect(CATALOG_DEFINITIONS.map((d) => d.key).sort()).toEqual(
      ["boat-operators", "boat-routes", "boats", "itineraries", "packages", "parking", "restaurants", "tourism", "transport"]
    );
  });

  for (const def of CATALOG_DEFINITIONS) {
    describe(def.key, () => {
      it("accepts a minimal valid payload", () => {
        const result = def.schema.safeParse(VALID[def.key]);
        expect(result.success).toBe(true);
      });

      it("rejects an empty payload (nothing is optional by accident)", () => {
        expect(def.schema.safeParse({}).success).toBe(false);
      });

      it("only references real catalogs from ref fields and every field name is unique", () => {
        const names = new Set<string>();
        for (const f of def.fields) {
          expect(names.has(f.name)).toBe(false);
          names.add(f.name);
        }
        walk(def.fields, (f) => {
          if (f.type === "ref") expect(getCatalogDefinition(f.refKey)).toBeTruthy();
        });
      });

      it("has a form field (or derives) for every filter key, and a title field present in the form", () => {
        const names = new Set(def.fields.map((f) => f.name));
        expect(names.has(def.titleField)).toBe(true);
        for (const key of def.filterKeys) {
          const derived = def.derive ? Object.keys(def.derive({ durationDays: 1 })) : [];
          expect(names.has(key) || derived.includes(key)).toBe(true);
        }
      });

      it("keeps private fields as real form fields (so admins can still edit them)", () => {
        const names = new Set(def.fields.map((f) => f.name));
        for (const key of def.privateFields) expect(names.has(key)).toBe(true);
      });

      it("dependents point at registered collections", () => {
        const collections = new Set(CATALOG_DEFINITIONS.map((d) => d.collection));
        for (const dep of def.dependents) expect(collections.has(dep.collection)).toBe(true);
      });
    });
  }

  it("requireCatalogDefinition throws on unknown keys", () => {
    expect(() => requireCatalogDefinition("nope")).toThrow();
  });
});

describe("business rules", () => {
  const transport = requireCatalogDefinition("transport");
  it("transport: a priced model requires an amount; ON_REQUEST does not", () => {
    expect(transport.schema.safeParse({ ...VALID.transport, amountInr: undefined }).success).toBe(false);
    expect(transport.schema.safeParse({ ...VALID.transport, pricingModel: "ON_REQUEST", amountInr: undefined }).success).toBe(true);
  });
  it("transport: rejects negative or fractional prices and a bad timetable time", () => {
    expect(transport.schema.safeParse({ ...VALID.transport, amountInr: -1 }).success).toBe(false);
    expect(transport.schema.safeParse({ ...VALID.transport, amountInr: 10.5 }).success).toBe(false);
    expect(transport.schema.safeParse({ ...VALID.transport, departures: [{ from: "A", to: "B", time: "25:99" }] }).success).toBe(false);
  });

  it("boat routes: safety information is mandatory and schedules need at least one day", () => {
    const route = requireCatalogDefinition("boat-routes");
    expect(route.schema.safeParse({ ...VALID["boat-routes"], safetyInfo: { en: "", te: "" } }).success).toBe(false);
    expect(route.schema.safeParse({ ...VALID["boat-routes"], schedules: [{ days: [], departureTime: "06:00" }] }).success).toBe(false);
  });

  it("parking: needs a vehicle type, a positive capacity and a known status", () => {
    const parking = requireCatalogDefinition("parking");
    expect(parking.schema.safeParse({ ...VALID.parking, vehicleTypes: [] }).success).toBe(false);
    expect(parking.schema.safeParse({ ...VALID.parking, capacity: 0 }).success).toBe(false);
    expect(parking.schema.safeParse({ ...VALID.parking, status: "UNKNOWN" }).success).toBe(false);
  });

  it("parking: status changes are server-stamped (manual data must show when it was set)", () => {
    expect(parking().stampOnChange).toEqual([{ field: "status", stampField: "statusUpdatedAt" }]);
    function parking() {
      return requireCatalogDefinition("parking");
    }
  });

  it("restaurants: coordinates are range-checked", () => {
    const r = requireCatalogDefinition("restaurants");
    expect(r.schema.safeParse({ ...VALID.restaurants, location: { latitude: 120, longitude: 0 } }).success).toBe(false);
  });

  it("itineraries: duration must match the number of day blocks, and every day needs a stop", () => {
    const it2 = requireCatalogDefinition("itineraries");
    expect(it2.schema.safeParse({ ...VALID.itineraries, durationDays: 3 }).success).toBe(false);
    expect(it2.schema.safeParse({ ...VALID.itineraries, days: [{ title: L("D"), stops: [] }] }).success).toBe(false);
  });

  it("itineraries: tripType is derived server-side from duration", () => {
    const def = requireCatalogDefinition("itineraries") as CatalogDefinition;
    expect(def.derive?.({ durationDays: 1 })).toEqual({ tripType: "ONE_DAY" });
    expect(def.derive?.({ durationDays: 3 })).toEqual({ tripType: "MULTI_DAY" });
  });

  it("operators and boats can't be deleted while routes/boats reference them", () => {
    expect(requireCatalogDefinition("boat-operators").dependents.map((d) => d.collection).sort()).toEqual(["boatRoutes", "boats"]);
    expect(requireCatalogDefinition("boats").dependents.map((d) => d.collection)).toEqual(["boatRoutes"]);
    expect(requireCatalogDefinition("itineraries").dependents.map((d) => d.collection)).toEqual(["travelPackages"]);
  });

  it("provider phone numbers are private by definition", () => {
    expect(requireCatalogDefinition("transport").privateFields).toEqual(["contactPhone"]);
    expect(requireCatalogDefinition("boat-operators").privateFields).toEqual(["contactPhone"]);
  });
});

describe("cardFor", () => {
  const base = { id: "x1", published: true, createdAt: "", updatedAt: "" };

  it("never shows a missing price as a number", () => {
    expect(priceText(undefined)).toBe("Price on request");
    expect(priceText(500)).toBe("₹500");
    const card = cardFor("packages", { ...base, ...VALID.packages } as unknown as CatalogItem);
    expect(card.price).toBe("Price on request");
    expect(card.href).toBe("/packages/x1");
  });

  it("restaurant badge follows the computed open state; unknown hours show no badge", () => {
    const noon = new Date("2026-10-07T06:30:00Z"); // 12:00 IST
    const open = cardFor("restaurants", { ...base, ...VALID.restaurants, opensAt: "08:00", closesAt: "22:00", closedDays: [] } as unknown as CatalogItem, noon);
    expect(open.badge?.label).toBe("Open now");
    const closed = cardFor("restaurants", { ...base, ...VALID.restaurants, opensAt: "08:00", closesAt: "22:00", closedDays: [], temporarilyClosed: true } as unknown as CatalogItem, noon);
    expect(closed.badge?.label).toBe("Closed now");
    expect(cardFor("restaurants", { ...base, ...VALID.restaurants } as unknown as CatalogItem, noon).badge).toBeUndefined();
  });

  it("parking card carries the status badge", () => {
    expect(cardFor("parking", { ...base, ...VALID.parking, status: "FULL" } as unknown as CatalogItem).badge?.tone).toBe("danger");
  });

  it("boat card links to its operator (no standalone boat page)", () => {
    expect(cardFor("boats", { ...base, ...VALID.boats } as unknown as CatalogItem).href).toBe("/boats/operators/op1");
  });
});
