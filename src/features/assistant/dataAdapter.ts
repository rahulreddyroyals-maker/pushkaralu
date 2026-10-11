import "server-only";
import { listEvents, listAnnouncements } from "@/features/events/api";
import { listGhats } from "@/features/ghats/api";
import { listTemples } from "@/features/temples/api";
import { listHotels } from "@/features/hotels/api";
import { listPurohits } from "@/features/purohits/api";
import { loadPublicList } from "@/features/catalog/publicApi";
import { listContent } from "@/features/content/api";
import { CONTENT_KEYS } from "@/features/content/sections";
import type { AssistantData, ContentLite, Loc } from "./types";

/**
 * Firestore-backed AssistantData. Everything goes through the same
 * published-only, private-field-stripped reads the public site uses, so the
 * assistant can never see (or repeat) an unpublished listing or a provider's
 * private phone number.
 */
const loc = (v: unknown): Loc => ({ en: (v as Loc | undefined)?.en ?? "", te: (v as Loc | undefined)?.te ?? "" });
type Rec = Record<string, unknown> & { id: string };
const catalog = async (key: string): Promise<Rec[]> => (await loadPublicList(key, { pageSize: 50 })).items as unknown as Rec[];
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const firestoreAssistantData: AssistantData = {
  async events() {
    return (await listEvents({ pageSize: 20 })).items.map((e) => ({ id: e.id, name: loc(e.name), description: loc(e.description), startDate: e.startDate, endDate: e.endDate, status: e.status, river: e.river }));
  },
  async announcements(eventId) {
    return (await listAnnouncements(eventId, { pageSize: 5 })).items.map((a) => ({ id: a.id, eventId, title: loc(a.title), body: loc(a.body), createdAt: a.createdAt }));
  },
  async ghats(eventId) {
    return (await listGhats(eventId, { pageSize: 50 })).items.map((g) => ({
      id: g.id, eventId, name: loc(g.name), description: loc(g.description), location: g.location, facilities: g.facilities,
      crowdStatus: g.crowdStatus, crowdStatusUpdatedAt: g.crowdStatusUpdatedAt, crowdReported: g.crowdStatusUpdatedBy !== null && g.crowdStatusUpdatedBy !== undefined,
      waitMinutes: g.waitMinutes, operationalStatus: g.operationalStatus, alternativeGhatId: g.alternativeGhatId, statusNote: g.statusNote,
      parkingInfo: loc(g.parkingInfo), medicalInfo: loc(g.medicalInfo),
    }));
  },
  async temples() {
    return (await listTemples({ pageSize: 50 })).items.map((t) => ({ id: t.id, name: loc(t.name), description: loc(t.description), timings: t.timings, address: t.address, location: t.location, nearbyAttractions: t.nearbyAttractions }));
  },
  async hotels() {
    return (await listHotels({ pageSize: 50 })).items.map((h) => ({ id: h.id, name: loc(h.name), address: h.address, location: h.location, amenities: h.amenities, priceMin: h.priceRangeMin, priceMax: h.priceRangeMax }));
  },
  async purohits() {
    return (await listPurohits({ pageSize: 50 })).items.map((p) => ({ id: p.id, name: loc(p.name), languages: p.languages, experienceYears: p.experienceYears, address: p.address, location: p.location, pricingNote: loc(p.pricingNote), availabilityNote: loc(p.availabilityNote) }));
  },
  async transport() {
    return (await catalog("transport")).map((r) => ({
      id: r.id, kind: String(r.kind), name: loc(r.name), serviceArea: loc(r.serviceArea), address: String(r.address ?? ""), location: r.location as never,
      pricingModel: String(r.pricingModel), amountInr: r.amountInr as number | undefined, pricingNote: loc(r.pricingNote), operatingHours: r.operatingHours as string | undefined,
      departures: arr(r.departures), availableForEvents: arr<string>(r.availableForEvents),
    }));
  },
  async parking() {
    return (await catalog("parking")).map((r) => ({
      id: r.id, name: loc(r.name), address: String(r.address ?? ""), location: r.location as never, capacity: Number(r.capacity) || 0, status: String(r.status),
      statusUpdatedAt: r.statusUpdatedAt as string | undefined, vehicleTypes: arr<string>(r.vehicleTypes), opensAt: r.opensAt as string | undefined, closesAt: r.closesAt as string | undefined,
      availableForEvents: arr<string>(r.availableForEvents),
    }));
  },
  async emergency() {
    return (await catalog("emergency-services")).map((r) => ({
      id: r.id, kind: String(r.kind), name: loc(r.name), phone: String(r.phone), alternatePhone: r.alternatePhone as string | undefined, address: r.address as string | undefined,
      location: r.location as never, open24x7: Boolean(r.open24x7), openingHours: r.openingHours as string | undefined, verifiedOn: String(r.verifiedOn), verificationSource: String(r.verificationSource),
    }));
  },
  async itineraries() {
    return (await catalog("itineraries")).map((r) => ({
      id: r.id, title: loc(r.title), summary: loc(r.summary), durationDays: Number(r.durationDays) || 1, suitableFor: arr<string>(r.suitableFor),
      days: arr<{ title: unknown; stops: { time?: string; title: unknown; durationMinutes?: number }[] }>(r.days).map((d) => ({ title: loc(d.title), stops: arr<{ time?: string; title: unknown; durationMinutes?: number }>(d.stops).map((s) => ({ time: s.time || undefined, title: loc(s.title), durationMinutes: s.durationMinutes })) })),
      tips: loc(r.tips), availableForEvents: arr<string>(r.availableForEvents),
    }));
  },
  async packages() {
    return (await catalog("packages")).map((r) => ({ id: r.id, title: loc(r.title), summary: loc(r.summary), durationDays: Number(r.durationDays) || 1, nights: Number(r.nights) || 0, priceFromInr: r.priceFromInr as number | undefined, priceNote: loc(r.priceNote), departureCity: r.departureCity as string | undefined }));
  },
  async content() {
    const out: ContentLite[] = [];
    for (const key of CONTENT_KEYS) {
      for (const r of (await listContent(key, { pageSize: 50 })).items) {
        out.push({ section: key, slug: r.slug, title: loc(r.title), summary: loc(r.summary), body: loc(r.body), topic: r.topic, updatedAt: r.updatedAt });
      }
    }
    return out;
  },
};
