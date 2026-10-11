import type { GenerateRequest, GenerateResult, LlmProvider } from "@/lib/ai/types";
import type { AssistantData } from "./types";

export const NOW = new Date("2027-07-10T06:00:00Z");
const L = (en: string, te = "") => ({ en, te: te || `${en} (te)` });

export const GHAT_A = { latitude: 17.0, longitude: 81.78 };
export const GHAT_B = { latitude: 17.05, longitude: 81.8 };

export function fakeData(overrides: Partial<AssistantData> = {}): AssistantData {
  return {
    events: async () => [{ id: "ev1", name: L("Godavari Pushkaralu 2027", "గోదావరి పుష్కరాలు 2027"), description: L("The festival."), startDate: "2027-07-23T00:00:00Z", endDate: "2027-08-03T00:00:00Z", status: "UPCOMING", river: "GODAVARI" }],
    announcements: async () => [{ id: "an1", eventId: "ev1", title: L("Ghat timings revised"), body: L("Ghats open from 4 AM."), createdAt: "2027-07-09T10:00:00Z" }],
    ghats: async () => [
      { id: "g1", eventId: "ev1", name: L("Kotilingala Ghat"), description: L(""), location: GHAT_A, facilities: ["parking", "toilets", "wheelchair_access"], crowdStatus: "HIGH", crowdStatusUpdatedAt: "2027-07-10T05:30:00Z", crowdReported: true, waitMinutes: 45, operationalStatus: "OPEN", alternativeGhatId: "g2", parkingInfo: L(""), medicalInfo: L("First-aid tent near the steps") },
      { id: "g2", eventId: "ev1", name: L("Pushkar Ghat"), description: L(""), location: GHAT_B, facilities: ["toilets"], crowdStatus: "LOW", crowdStatusUpdatedAt: "2027-07-01T00:00:00Z", crowdReported: false, operationalStatus: "UNKNOWN", parkingInfo: L(""), medicalInfo: L("") },
    ],
    temples: async () => [
      { id: "t1", name: L("Far Temple"), description: L("d"), timings: "6 AM – 12 PM", address: "Far Rd", location: { latitude: 17.3, longitude: 82.0 }, nearbyAttractions: [] },
      { id: "t2", name: L("Near Temple"), description: L("d"), timings: "6 AM – 8 PM", address: "Near Rd", location: { latitude: 17.01, longitude: 81.79 }, nearbyAttractions: ["Old fort"] },
      { id: "t3", name: L("Mid Temple"), description: L("d"), timings: "7 AM – 1 PM", address: "Mid Rd", location: { latitude: 17.1, longitude: 81.85 }, nearbyAttractions: [] },
    ],
    hotels: async () => [
      { id: "h1", name: L("Far Hotel"), address: "A", location: { latitude: 17.4, longitude: 82.0 }, amenities: ["ac"], priceMin: 1500, priceMax: 2500 },
      { id: "h2", name: L("Near Hotel"), address: "B", location: { latitude: 17.001, longitude: 81.781 }, amenities: ["ac", "elevator"], priceMin: 2000, priceMax: 3500 },
      { id: "h3", name: L("No Price Hotel"), address: "C", location: { latitude: 17.2, longitude: 81.9 }, amenities: [], priceMin: 0, priceMax: 0 },
    ],
    purohits: async () => [{ id: "p1", name: L("Pandit Rao"), languages: ["Telugu", "Hindi"], experienceYears: 20, address: "Temple St", location: GHAT_A, pricingNote: L("₹2,000 to ₹5,000 by ritual"), availabilityNote: L("Daily 6 AM–8 PM") }],
    transport: async () => [
      { id: "tr1", kind: "taxi", name: L("City Cabs"), serviceArea: L("Rajahmundry"), address: "Stand", location: GHAT_A, pricingModel: "ON_REQUEST", pricingNote: L(""), departures: [], availableForEvents: [] },
      { id: "tr2", kind: "bus", name: L("Hyd Express"), serviceArea: L(""), address: "Bus stand", location: GHAT_B, pricingModel: "FIXED", amountInr: 650, pricingNote: L(""), departures: [{ from: "Hyderabad", to: "Rajahmundry", time: "21:30" }], availableForEvents: ["ev9"] },
    ],
    parking: async () => [{ id: "pk1", name: L("Ground Parking"), address: "P", location: GHAT_A, capacity: 300, status: "FILLING", statusUpdatedAt: "2027-07-09T00:00:00Z", vehicleTypes: ["car"], availableForEvents: [] }],
    emergency: async () => [
      { id: "e1", kind: "AMBULANCE", name: L("Control Room Ambulance"), phone: "0883-2222333", address: "Hospital Rd", open24x7: true, verifiedOn: "2027-07-01", verificationSource: "Called on 1 July" },
      { id: "e2", kind: "POLICE", name: L("Police Control"), phone: "0883-2444555", open24x7: true, verifiedOn: "2026-01-01", verificationSource: "Visited" },
    ],
    itineraries: async () => [{ id: "i1", title: L("Two day pilgrimage"), summary: L("Easy pace"), durationDays: 2, suitableFor: ["ELDERLY", "FAMILY"], days: [{ title: L("Day 1"), stops: [{ time: "05:00", title: L("Holy dip") }, { title: L("Near Temple") }] }, { title: L("Day 2"), stops: [{ title: L("Mid Temple") }] }], tips: L("Rest often"), availableForEvents: [] }],
    packages: async () => [{ id: "pkg1", title: L("Weekend package"), summary: L("s"), durationDays: 2, nights: 1, priceFromInr: 4999, priceNote: L(""), departureCity: "Hyderabad" }],
    content: async () => [{ section: "faqs", slug: "what-to-carry", title: L("What should I carry?"), summary: L(""), body: L("Carry a change of clothes, water and ID."), topic: "overview", updatedAt: "2027-06-01T00:00:00Z" }],
    ...overrides,
  };
}

/** Scripted provider: returns the queued results in order and records every request. */
export function scriptedProvider(script: Partial<GenerateResult>[]): LlmProvider & { requests: GenerateRequest[] } {
  const requests: GenerateRequest[] = [];
  let i = 0;
  return {
    name: "scripted", model: "test", requests,
    async generate(req) {
      requests.push(structuredClone({ ...req, signal: undefined }));
      const next = script[Math.min(i++, script.length - 1)];
      const toolCalls = next.toolCalls ?? [];
      return { text: next.text ?? "", toolCalls, stopReason: toolCalls.length ? "tool_use" : "end", usage: next.usage };
    },
  };
}
