import type { ToolSpec } from "@/lib/ai/types";
import { formatInr } from "@/lib/catalog/format";
import { MANUAL_STATUS_STALE_HOURS, SAFETY_LIMITS } from "@/config/app";
import { nearestNeighbourOrder, straightLineKm } from "./geo";
import { label as L } from "./labels";
import { pickLoc } from "./lang";
import type { AssistantData, GhatLite, Lang, VerifiedItem, VerifiedKind } from "./types";

/**
 * The assistant's ONLY window onto dynamic facts. Each tool reads published
 * platform records through the AssistantData port, filters/sorts them in
 * plain code, and returns VerifiedItems whose facts are formatted here —
 * prices, crowd, status, dates and phone numbers never pass through the
 * model's own words.
 */
export interface ToolContext {
  data: AssistantData;
  lang: Lang;
  now: Date;
}
export interface ToolOutcome {
  /** What the model sees (JSON string). */
  content: string;
  /** What the UI shows as verified platform data. */
  items: VerifiedItem[];
}

const MAX_LIMIT = 8;
const DEFAULT_LIMIT = 5;
const clampLimit = (v: unknown) => Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : DEFAULT_LIMIT));
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

export function tokens(query: string): string[] {
  return query.toLowerCase().split(/[\s,.;:!?()"']+/u).filter((t) => t.length >= 2);
}
/** Every token must appear somewhere in the haystack (AND match) — precise enough for names/areas. */
export function matchesQuery(haystack: string, query: string): boolean {
  const ts = tokens(query);
  if (ts.length === 0) return true;
  const h = haystack.toLowerCase();
  return ts.every((t) => h.includes(t));
}

const item = (kind: VerifiedKind, id: string, title: string, href: string, facts: { label: string; value: string }[], extra: Partial<VerifiedItem> = {}): VerifiedItem =>
  ({ ref: `${kind}:${id}`, kind, id, title, href, facts, ...extra });

function relative(iso: string, now: Date, lang: Lang): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (lang === "te") return mins < 60 ? `${mins} నిమిషాల క్రితం` : mins < 1440 ? `${Math.round(mins / 60)} గంటల క్రితం` : `${Math.round(mins / 1440)} రోజుల క్రితం`;
  return mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} days ago`;
}
const isStaleIso = (iso: string, now: Date) => now.getTime() - new Date(iso).getTime() > MANUAL_STATUS_STALE_HOURS * 3_600_000;
const dateRange = (a: string, b: string, lang: Lang) => {
  const f = (iso: string) => new Date(iso).toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `${f(a)} – ${f(b)}`;
};

const outcome = (items: VerifiedItem[], extra: Record<string, unknown> = {}): ToolOutcome => ({
  items,
  content: JSON.stringify({
    count: items.length,
    ...(items.length === 0 ? { message: "No matching verified platform records. Say so plainly; do not guess or fill in from memory." } : {}),
    ...extra,
    items: items.map((i) => ({ ref: i.ref, title: i.title, facts: Object.fromEntries(i.facts.map((f) => [f.label, f.value])), ...(i.note ? { note: i.note } : {}), ...(i.asOf ? { asOf: i.asOf } : {}) })),
  }),
});

async function relevantEvents(ctx: ToolContext, eventId?: string) {
  const all = await ctx.data.events();
  if (eventId) return all.filter((e) => e.id === eventId);
  const live = all.filter((e) => e.status === "UPCOMING" || e.status === "ACTIVE");
  return (live.length ? live : all).slice(0, 3);
}

/** Resolve "near this ghat" to coordinates. Searches the ghats of every published event (cheap at this scale). */
async function findGhat(ctx: ToolContext, ghatId: string): Promise<GhatLite | undefined> {
  for (const ev of await ctx.data.events()) {
    const hit = (await ctx.data.ghats(ev.id)).find((g) => g.id === ghatId);
    if (hit) return hit;
  }
  return undefined;
}

function appliesTo(rec: { availableForEvents: string[] }, eventId?: string) {
  return !eventId || rec.availableForEvents.length === 0 || rec.availableForEvents.includes(eventId);
}

type Origin = { lat: number; lng: number; name: string };
async function resolveOrigin(ctx: ToolContext, args: Record<string, unknown>): Promise<Origin | undefined | "unknown_ghat"> {
  const id = str(args.nearGhatId);
  if (!id) return undefined;
  const g = await findGhat(ctx, id);
  if (!g) return "unknown_ghat";
  return { lat: g.location.latitude, lng: g.location.longitude, name: pickLoc(g.name, ctx.lang) };
}
const unknownGhat = (): ToolOutcome => ({ items: [], content: JSON.stringify({ count: 0, items: [], message: "That ghat id is not on the platform. Call search_ghats first to get a valid ghat ref id." }) });
const distFact = (ctx: ToolContext, from: Origin, to: { latitude: number; longitude: number }) => ({
  label: L(ctx.lang, "distance"),
  value: `~${straightLineKm({ latitude: from.lat, longitude: from.lng }, to)} km (${L(ctx.lang, "straight")}) — ${from.name}`,
});

type Runner = (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolOutcome>;
interface Tool { spec: ToolSpec; run: Runner }

const LIMIT_PROP = { type: "integer", minimum: 1, maximum: MAX_LIMIT, description: "Max results (default 5)" };
const NEAR_PROP = { type: "string", description: "Ghat id (the part after 'ghat:' in a ref) to measure distance from and sort by" };

export const TOOLS: Tool[] = [
  {
    spec: {
      name: "get_event_info",
      description: "Official event details (name, dates, status) and the latest official announcements. The ONLY source for event dates/schedules and announcements.",
      parameters: { type: "object", properties: { eventId: { type: "string" }, includeAnnouncements: { type: "boolean" } } },
    },
    async run(args, ctx) {
      const events = await relevantEvents(ctx, str(args.eventId) || undefined);
      const out: VerifiedItem[] = [];
      for (const e of events) {
        out.push(item("event", e.id, pickLoc(e.name, ctx.lang), `/events/${e.id}`, [
          { label: L(ctx.lang, "dates"), value: dateRange(e.startDate, e.endDate, ctx.lang) },
          { label: L(ctx.lang, "status"), value: e.status },
          { label: L(ctx.lang, "river"), value: e.river },
          { label: L(ctx.lang, "about"), value: clip(pickLoc(e.description, ctx.lang), 300) },
        ]));
        if (args.includeAnnouncements !== false) {
          for (const a of (await ctx.data.announcements(e.id)).slice(0, 3)) {
            out.push(item("announcement", a.id, pickLoc(a.title, ctx.lang), `/events/${e.id}`, [
              { label: L(ctx.lang, "announced"), value: a.createdAt.slice(0, 10) },
              { label: L(ctx.lang, "about"), value: clip(pickLoc(a.body, ctx.lang), 400) },
            ], { asOf: a.createdAt, note: L(ctx.lang, "officialNote") }));
          }
        }
      }
      return outcome(out);
    },
  },
  {
    spec: {
      name: "search_ghats",
      description: "Find bathing ghats with facilities and the latest crowd/open status entered by event staff.",
      parameters: { type: "object", properties: { eventId: { type: "string" }, query: { type: "string" }, facility: { type: "string", description: "e.g. parking, toilets, drinking_water, medical, wheelchair_access, changing_rooms, food_stalls" }, limit: LIMIT_PROP } },
    },
    async run(args, ctx) {
      const events = await relevantEvents(ctx, str(args.eventId) || undefined);
      const lists = await Promise.all(events.map((e) => ctx.data.ghats(e.id)));
      const all = lists.flat();
      const byId = new Map(all.map((g) => [g.id, g]));
      const q = str(args.query);
      const facility = str(args.facility);
      const found = all
        .filter((g) => matchesQuery(`${g.name.en ?? ""} ${g.name.te ?? ""}`, q))
        .filter((g) => !facility || g.facilities.includes(facility))
        .slice(0, clampLimit(args.limit));
      return outcome(found.map((g) => ghatItem(g, byId, ctx)));
    },
  },
  {
    spec: {
      name: "search_temples",
      description: "Find temples with listed timings and location. Can sort by distance from a ghat and propose a proximity-based visiting order.",
      parameters: { type: "object", properties: { query: { type: "string" }, nearGhatId: NEAR_PROP, suggestVisitOrder: { type: "boolean", description: "Group stops by proximity (not a timed route)" }, limit: LIMIT_PROP } },
    },
    async run(args, ctx) {
      const origin = await resolveOrigin(ctx, args);
      if (origin === "unknown_ghat") return unknownGhat();
      let temples = (await ctx.data.temples()).filter((t) => matchesQuery(`${t.name.en ?? ""} ${t.name.te ?? ""} ${t.address}`, str(args.query)));
      const limit = clampLimit(args.limit);
      if (origin) {
        const o = { latitude: origin.lat, longitude: origin.lng };
        temples = args.suggestVisitOrder === true
          ? nearestNeighbourOrder(temples, o)
          : [...temples].sort((a, b) => straightLineKm(o, a.location) - straightLineKm(o, b.location));
      }
      const chosen = temples.slice(0, limit);
      const ordered = args.suggestVisitOrder === true;
      return outcome(chosen.map((t, i) => item("temple", t.id, pickLoc(t.name, ctx.lang), `/temples/${t.id}`, [
        ...(ordered ? [{ label: L(ctx.lang, "order"), value: `#${i + 1}` }] : []),
        { label: L(ctx.lang, "timings"), value: t.timings || "—" },
        { label: L(ctx.lang, "address"), value: t.address },
        ...(origin ? [distFact(ctx, origin, t.location)] : []),
        ...(t.nearbyAttractions.length ? [{ label: L(ctx.lang, "nearby"), value: t.nearbyAttractions.slice(0, 4).join(", ") }] : []),
        { label: L(ctx.lang, "about"), value: clip(pickLoc(t.description, ctx.lang), 200) },
      ])), ordered ? { orderNote: "Order groups nearby stops by straight-line distance. It is not a timed route; do not state travel times." } : {});
    },
  },
  {
    spec: {
      name: "search_hotels",
      description: "Find verified hotels with their LISTED price range and amenities. Room availability is NOT known — never claim a room is available.",
      parameters: { type: "object", properties: { nearGhatId: NEAR_PROP, maxPricePerNight: { type: "integer" }, amenity: { type: "string", description: "wifi, ac, parking, restaurant, room_service, hot_water, elevator, pilgrim_friendly_timings" }, limit: LIMIT_PROP } },
    },
    async run(args, ctx) {
      const origin = await resolveOrigin(ctx, args);
      if (origin === "unknown_ghat") return unknownGhat();
      const max = num(args.maxPricePerNight);
      const amenity = str(args.amenity);
      let hotels = (await ctx.data.hotels()).filter((h) => (max === undefined || h.priceMin <= max) && (!amenity || h.amenities.includes(amenity)));
      if (origin) {
        const o = { latitude: origin.lat, longitude: origin.lng };
        hotels = [...hotels].sort((a, b) => straightLineKm(o, a.location) - straightLineKm(o, b.location));
      }
      return outcome(hotels.slice(0, clampLimit(args.limit)).map((h) => item("hotel", h.id, pickLoc(h.name, ctx.lang), `/hotels/${h.id}`, [
        { label: L(ctx.lang, "price"), value: h.priceMax > 0 ? `${formatInr(h.priceMin)}–${formatInr(h.priceMax)} ${L(ctx.lang, "perNight")}` : L(ctx.lang, "priceNotListed") },
        { label: L(ctx.lang, "address"), value: h.address },
        ...(origin ? [distFact(ctx, origin, h.location)] : []),
        ...(h.amenities.length ? [{ label: L(ctx.lang, "amenities"), value: h.amenities.join(", ") }] : []),
      ], { note: L(ctx.lang, "availabilityNote") })), { reminder: "Availability and final price are not known to the platform." });
    },
  },
  {
    spec: {
      name: "search_purohits",
      description: "Find verified purohits by language or proximity. Pricing/availability are free-text statements by the purohit, quote them as such.",
      parameters: { type: "object", properties: { language: { type: "string" }, nearGhatId: NEAR_PROP, limit: LIMIT_PROP } },
    },
    async run(args, ctx) {
      const origin = await resolveOrigin(ctx, args);
      if (origin === "unknown_ghat") return unknownGhat();
      const lang = str(args.language).toLowerCase();
      let list = (await ctx.data.purohits()).filter((p) => !lang || p.languages.some((l) => l.toLowerCase().includes(lang)));
      if (origin) {
        const o = { latitude: origin.lat, longitude: origin.lng };
        list = [...list].sort((a, b) => straightLineKm(o, a.location) - straightLineKm(o, b.location));
      }
      return outcome(list.slice(0, clampLimit(args.limit)).map((p) => item("purohit", p.id, pickLoc(p.name, ctx.lang), `/purohits/${p.id}`, [
        { label: L(ctx.lang, "languages"), value: p.languages.join(", ") || "—" },
        { label: L(ctx.lang, "experience"), value: `${p.experienceYears} ${L(ctx.lang, "years")}` },
        { label: L(ctx.lang, "address"), value: p.address },
        ...(origin ? [distFact(ctx, origin, p.location)] : []),
        ...(pickLoc(p.pricingNote, ctx.lang) ? [{ label: L(ctx.lang, "pricingProvider"), value: clip(pickLoc(p.pricingNote, ctx.lang), 160) }] : []),
        ...(pickLoc(p.availabilityNote, ctx.lang) ? [{ label: L(ctx.lang, "availabilityProvider"), value: clip(pickLoc(p.availabilityNote, ctx.lang), 160) }] : []),
      ], { note: L(ctx.lang, "confirmPrice") })));
    },
  },
  {
    spec: {
      name: "search_transport",
      description: "Taxis, buses, trains and other transport providers with listed fares/timetables.",
      parameters: { type: "object", properties: { kind: { type: "string" }, eventId: { type: "string" }, nearGhatId: NEAR_PROP, limit: LIMIT_PROP } },
    },
    async run(args, ctx) {
      const origin = await resolveOrigin(ctx, args);
      if (origin === "unknown_ghat") return unknownGhat();
      const kind = str(args.kind).toLowerCase();
      let list = (await ctx.data.transport()).filter((t) => (!kind || t.kind.toLowerCase().includes(kind)) && appliesTo(t, str(args.eventId) || undefined));
      if (origin) {
        const o = { latitude: origin.lat, longitude: origin.lng };
        list = [...list].sort((a, b) => straightLineKm(o, a.location) - straightLineKm(o, b.location));
      }
      return outcome(list.slice(0, clampLimit(args.limit)).map((t) => item("transport", t.id, pickLoc(t.name, ctx.lang), `/travel/${t.id}`, [
        { label: L(ctx.lang, "type"), value: t.kind },
        ...(pickLoc(t.serviceArea, ctx.lang) ? [{ label: L(ctx.lang, "area"), value: pickLoc(t.serviceArea, ctx.lang) }] : []),
        { label: L(ctx.lang, "pickup"), value: t.address },
        { label: L(ctx.lang, "fare"), value: t.pricingModel === "ON_REQUEST" || t.amountInr === undefined ? L(ctx.lang, "onRequest") : `${formatInr(t.amountInr)} (${t.pricingModel.toLowerCase().replace("_", " ")}, ${L(ctx.lang, "indicative")})` },
        ...(t.operatingHours ? [{ label: L(ctx.lang, "hours"), value: t.operatingHours }] : []),
        ...(t.departures.length ? [{ label: L(ctx.lang, "departures"), value: t.departures.slice(0, 4).map((d) => `${d.from}→${d.to} ${d.time}`).join("; ") }] : []),
        ...(origin ? [distFact(ctx, origin, t.location)] : []),
      ], { note: L(ctx.lang, "providerNote") })));
    },
  },
  {
    spec: {
      name: "search_parking",
      description: "Parking areas with capacity and the latest status entered by staff.",
      parameters: { type: "object", properties: { eventId: { type: "string" }, nearGhatId: NEAR_PROP, limit: LIMIT_PROP } },
    },
    async run(args, ctx) {
      const origin = await resolveOrigin(ctx, args);
      if (origin === "unknown_ghat") return unknownGhat();
      let list = (await ctx.data.parking()).filter((p) => appliesTo(p, str(args.eventId) || undefined));
      if (origin) {
        const o = { latitude: origin.lat, longitude: origin.lng };
        list = [...list].sort((a, b) => straightLineKm(o, a.location) - straightLineKm(o, b.location));
      }
      return outcome(list.slice(0, clampLimit(args.limit)).map((p) => {
        const stale = p.statusUpdatedAt ? isStaleIso(p.statusUpdatedAt, ctx.now) : true;
        return item("parking", p.id, pickLoc(p.name, ctx.lang), `/parking/${p.id}`, [
          { label: L(ctx.lang, "parkingStatus"), value: p.statusUpdatedAt ? `${p.status} (${L(ctx.lang, "updated")} ${relative(p.statusUpdatedAt, ctx.now, ctx.lang)}${stale ? `, ${L(ctx.lang, "mayBeOutdated")}` : ""})` : L(ctx.lang, "crowdNotReported") },
          { label: L(ctx.lang, "capacity"), value: `${p.capacity} ${L(ctx.lang, "vehicles")}` },
          { label: L(ctx.lang, "address"), value: p.address },
          ...(p.opensAt && p.closesAt ? [{ label: L(ctx.lang, "hoursOpen"), value: `${p.opensAt}–${p.closesAt}` }] : []),
          ...(origin ? [distFact(ctx, origin, p.location)] : []),
        ], { asOf: p.statusUpdatedAt, note: L(ctx.lang, "manualNote") });
      }));
    },
  },
  {
    spec: {
      name: "get_emergency_contacts",
      description: "Verified emergency directory (police, ambulance, hospitals…). The ONLY source of emergency phone numbers.",
      parameters: { type: "object", properties: { kind: { type: "string", description: "POLICE, AMBULANCE, FIRE, HOSPITAL, PHARMACY, FIRST_AID" }, limit: LIMIT_PROP } },
    },
    async run(args, ctx) {
      const kind = str(args.kind).toUpperCase();
      const list = (await ctx.data.emergency()).filter((e) => !kind || e.kind === kind);
      return outcome(list.slice(0, clampLimit(args.limit ?? 8)).map((e) => {
        const ageDays = (ctx.now.getTime() - new Date(e.verifiedOn).getTime()) / 86_400_000;
        return item("emergency", e.id, pickLoc(e.name, ctx.lang), "/emergency", [
          { label: L(ctx.lang, "type"), value: e.kind },
          { label: L(ctx.lang, "phone"), value: e.phone },
          ...(e.alternatePhone ? [{ label: L(ctx.lang, "altPhone"), value: e.alternatePhone }] : []),
          ...(e.address ? [{ label: L(ctx.lang, "address"), value: e.address }] : []),
          ...(e.open24x7 ? [{ label: L(ctx.lang, "hoursOpen"), value: L(ctx.lang, "open24") }] : e.openingHours ? [{ label: L(ctx.lang, "hoursOpen"), value: e.openingHours }] : []),
          { label: L(ctx.lang, "verified"), value: `${e.verifiedOn} (${e.verificationSource})` },
        ], { note: ageDays > SAFETY_LIMITS.emergencyReverifyDays ? L(ctx.lang, "staleVerify") : undefined });
      }));
    },
  },
  {
    spec: {
      name: "search_itineraries",
      description: "Itineraries written by the Pushkaralu team (one-day / multi-day). Use as the backbone for trip plans.",
      parameters: { type: "object", properties: { durationDays: { type: "integer" }, suitableFor: { type: "string", description: "e.g. elderly, family, children" }, eventId: { type: "string" }, limit: LIMIT_PROP } },
    },
    async run(args, ctx) {
      const days = num(args.durationDays);
      const suit = str(args.suitableFor).toLowerCase();
      const list = (await ctx.data.itineraries())
        .filter((i) => (days === undefined || i.durationDays <= days) && (!suit || i.suitableFor.some((s) => s.toLowerCase().includes(suit))) && appliesTo(i, str(args.eventId) || undefined))
        .slice(0, clampLimit(args.limit ?? 3));
      return outcome(list.map((i) => item("itinerary", i.id, pickLoc(i.title, ctx.lang), `/tourism/itineraries/${i.id}`, [
        { label: L(ctx.lang, "duration"), value: `${i.durationDays} ${L(ctx.lang, "days")}` },
        ...(i.suitableFor.length ? [{ label: L(ctx.lang, "suitable"), value: i.suitableFor.join(", ") }] : []),
        { label: L(ctx.lang, "summary"), value: clip(pickLoc(i.summary, ctx.lang), 240) },
        ...i.days.slice(0, 5).map((d, n) => ({
          label: `${L(ctx.lang, "plan")} ${n + 1}`,
          value: `${pickLoc(d.title, ctx.lang)}: ${d.stops.slice(0, 6).map((s) => `${s.time ? `${s.time} ` : ""}${pickLoc(s.title, ctx.lang)}`).join(" → ")}`,
        })),
        ...(pickLoc(i.tips, ctx.lang) ? [{ label: L(ctx.lang, "tips"), value: clip(pickLoc(i.tips, ctx.lang), 240) }] : []),
      ], { note: L(ctx.lang, "editorialNote") })));
    },
  },
  {
    spec: {
      name: "search_packages",
      description: "Travel packages with indicative 'from' prices.",
      parameters: { type: "object", properties: { maxDays: { type: "integer" }, limit: LIMIT_PROP } },
    },
    async run(args, ctx) {
      const max = num(args.maxDays);
      const list = (await ctx.data.packages()).filter((p) => max === undefined || p.durationDays <= max).slice(0, clampLimit(args.limit ?? 3));
      return outcome(list.map((p) => item("package", p.id, pickLoc(p.title, ctx.lang), `/packages/${p.id}`, [
        { label: L(ctx.lang, "duration"), value: `${p.durationDays} ${L(ctx.lang, "days")} / ${p.nights} ${L(ctx.lang, "nights")}` },
        { label: L(ctx.lang, "from"), value: p.priceFromInr === undefined ? L(ctx.lang, "onRequest") : formatInr(p.priceFromInr) },
        ...(p.departureCity ? [{ label: L(ctx.lang, "departureCity"), value: p.departureCity }] : []),
        { label: L(ctx.lang, "summary"), value: clip(pickLoc(p.summary, ctx.lang), 200) },
      ], { note: L(ctx.lang, "confirmPrice") })));
    },
  },
  {
    spec: {
      name: "search_guides",
      description: "Search editorial articles, pilgrim guides, FAQs, location and service pages written by the Pushkaralu team. Use for general Pushkaralu questions before answering from general knowledge.",
      parameters: { type: "object", properties: { query: { type: "string" }, limit: LIMIT_PROP }, required: ["query"] },
    },
    async run(args, ctx) {
      const q = str(args.query);
      const scored = (await ctx.data.content())
        .map((c) => {
          const t = `${pickLoc(c.title, ctx.lang)} ${pickLoc(c.summary, ctx.lang)}`;
          const b = pickLoc(c.body, ctx.lang);
          const score = tokens(q).reduce((n, tok) => n + (t.toLowerCase().includes(tok) ? 3 : 0) + (b.toLowerCase().includes(tok) ? 1 : 0), 0);
          return { c, score };
        })
        .filter((x) => x.score > 0 && pickLoc(x.c.body, ctx.lang))
        .sort((a, b) => b.score - a.score)
        .slice(0, clampLimit(args.limit ?? 3));
      return outcome(scored.map(({ c }) => item("content", `${c.section}/${c.slug}`, pickLoc(c.title, ctx.lang), `${ctx.lang === "te" ? "/te" : ""}${SECTION_PATH[c.section]}/${c.slug}`, [
        { label: L(ctx.lang, "section"), value: c.section },
        { label: L(ctx.lang, "about"), value: clip(pickLoc(c.body, ctx.lang).replace(/[#*>`]/g, "").replace(/\s+/g, " "), 450) },
      ], { asOf: c.updatedAt, note: L(ctx.lang, "editorialNote") })));
    },
  },
];

const SECTION_PATH: Record<string, string> = { articles: "/articles", "pilgrim-guides": "/pilgrim-guides", faqs: "/faqs", "location-pages": "/locations", "service-pages": "/services" };

function ghatItem(g: GhatLite, byId: Map<string, GhatLite>, ctx: ToolContext): VerifiedItem {
  const { lang, now } = ctx;
  const stale = g.crowdReported && isStaleIso(g.crowdStatusUpdatedAt, now);
  const crowd = g.crowdReported
    ? `${g.crowdStatus} (${L(lang, "crowdManual")}, ${L(lang, "updated")} ${relative(g.crowdStatusUpdatedAt, now, lang)}${stale ? `, ${L(lang, "mayBeOutdated")}` : ""})`
    : L(lang, "crowdNotReported");
  const open = g.operationalStatus === "OPEN" ? L(lang, "open") : g.operationalStatus === "CLOSED" ? L(lang, "closed") : L(lang, "openNotReported");
  const alt = g.alternativeGhatId ? byId.get(g.alternativeGhatId) : undefined;
  const wait = g.crowdReported && g.waitMinutes !== null && g.waitMinutes !== undefined ? (g.waitMinutes === 0 ? "0 min" : `~${g.waitMinutes} min`) : undefined;
  return item("ghat", g.id, pickLoc(g.name, lang), `/events/${g.eventId}/ghats/${g.id}`, [
    { label: L(lang, "crowd"), value: crowd },
    { label: L(lang, "openState"), value: open },
    ...(wait ? [{ label: L(lang, "wait"), value: wait }] : []),
    ...(alt ? [{ label: L(lang, "alternative"), value: pickLoc(alt.name, lang) }] : []),
    ...(g.statusNote ? [{ label: L(lang, "note"), value: clip(g.statusNote, 200) }] : []),
    { label: L(lang, "facilities"), value: g.facilities.join(", ") || "—" },
    ...(pickLoc(g.parkingInfo, lang) ? [{ label: L(lang, "parking"), value: clip(pickLoc(g.parkingInfo, lang), 160) }] : []),
    ...(pickLoc(g.medicalInfo, lang) ? [{ label: L(lang, "medical"), value: clip(pickLoc(g.medicalInfo, lang), 160) }] : []),
  ], { asOf: g.crowdReported ? g.crowdStatusUpdatedAt : undefined, note: L(lang, "manualNote") });
}

export const TOOL_SPECS: ToolSpec[] = TOOLS.map((t) => t.spec);
const BY_NAME = new Map(TOOLS.map((t) => [t.spec.name, t]));

/** Runs a model-requested tool. Unknown tools and thrown errors become an error message for the model — never an exception that leaks internals. */
export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const tool = BY_NAME.get(name);
  if (!tool) return { items: [], content: JSON.stringify({ error: `Unknown tool ${name}` }) };
  try {
    return await tool.run(args, ctx);
  } catch (error) {
    console.error(`[assistant] tool ${name} failed`, error);
    return { items: [], content: JSON.stringify({ error: "This lookup is temporarily unavailable. Tell the person you could not retrieve it right now and point them to the relevant page." }) };
  }
}
