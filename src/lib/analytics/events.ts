import { z } from "zod";

/**
 * Analytics event model (client -> server). Deliberately small and
 * privacy-light: no user id, no IP, no session id and no free-form
 * payload is ever stored. Everything becomes a daily counter, keyed by
 * what happened and to which thing — not by who did it.
 */
export const EVENT_TYPES = ["page_view", "entity_view", "search", "app_open", "click", "share", "inquiry_start", "ad_impression", "ad_click"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Things a visitor can view / click / share — derived from the URL on the server, never trusted from the client for views. */
export const ENTITY_TYPES = [
  "hotel", "purohit", "business", "transport", "restaurant", "boat_route", "package", "itinerary",
  "ghat", "temple", "parking", "tourism", "event",
  "article", "pilgrim_guide", "faq", "location_page", "service_page",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Which entity types count as "providers/services" and which as "locations" in the dashboards. */
export const SERVICE_ENTITY_TYPES: EntityType[] = ["hotel", "purohit", "business", "transport", "restaurant", "boat_route", "package"];
export const LOCATION_ENTITY_TYPES: EntityType[] = ["ghat", "temple", "parking", "tourism"];
/** Listing types whose owners get a business dashboard. */
export const OWNED_ENTITY_TYPES = ["hotel", "purohit", "business"] as const;

export const CLICK_ACTIONS = ["call", "directions", "inquiry", "book", "website", "other"] as const;
export const SHARE_CHANNELS = ["whatsapp", "facebook", "copy", "other"] as const;

export const analyticsEventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  path: z.string().trim().max(200).default("/"),
  /** click/share/inquiry_start action, or ad placement for ad events. */
  action: z.string().trim().max(40).optional(),
  /** search text (type "search") — sanitised server-side. */
  term: z.string().max(200).optional(),
  /** ad events only. */
  campaignId: z.string().trim().max(60).optional(),
  /** Human label for entity views (page title) — display-only, length-capped. */
  label: z.string().max(200).optional(),
  /** True when this is the first time in this browser session — the client's de-duplication, used for "unique" counts. */
  first: z.boolean().default(false),
});
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

export const batchSchema = z.object({ events: z.array(analyticsEventSchema).min(1).max(20) });

/** A resolved, ready-to-count event. */
export interface CountedEvent {
  type: EventType;
  entityType: string;
  entityId: string;
  action: string;
  label: string;
  first: boolean;
}

/** Private / transactional areas are never tracked (client skips them, server drops them). */
const UNTRACKED = ["/admin", "/provider", "/login", "/register", "/forgot-password", "/profile", "/api", "/bookings", "/family", "/notifications", "/lost-and-found/report", "/lost-and-found/mine", "/r/"];
export function isTrackablePath(rawPath: string): boolean {
  let p = rawPath.split(/[?#]/)[0].toLowerCase();
  if (p === "/te" || p.startsWith("/te/")) p = p.slice(3) || "/";
  return !UNTRACKED.some((u) => (u.endsWith("/") ? p.startsWith(u) : p === u || p.startsWith(`${u}/`)));
}

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|httpclient/i;
export const isBot = (userAgent: string | null | undefined): boolean => !userAgent || BOT.test(userAgent);

const ID_LIKE = /^(?=.*\d)[A-Za-z0-9_-]{15,}$/;

/** Strips query/hash, lowercases, and collapses id-looking segments to `[id]` so page_view cardinality stays bounded. */
export function normalizePath(raw: string): string {
  const base = raw.split(/[?#]/)[0].toLowerCase().replace(/\/{2,}/g, "/");
  const clean = base.startsWith("/") ? base : `/${base}`;
  const segs = clean.split("/").filter(Boolean).map((s) => (ID_LIKE.test(s) ? "[id]" : s.slice(0, 60)));
  return `/${segs.slice(0, 6).join("/")}`;
}

const PREFIX_TYPES: [string, EntityType][] = [
  ["hotels", "hotel"], ["purohits", "purohit"], ["businesses", "business"], ["travel", "transport"], ["restaurants", "restaurant"],
  ["temples", "temple"], ["parking", "parking"], ["tourism", "tourism"], ["packages", "package"], ["articles", "article"],
  ["pilgrim-guides", "pilgrim_guide"], ["faqs", "faq"], ["locations", "location_page"], ["services", "service_page"],
];

/** Which entity (if any) a URL path shows. Handles the /te prefix. The id is the real record id or slug. */
export function classifyPath(rawPath: string): { entityType: EntityType; entityId: string } | null {
  let segs = rawPath.split(/[?#]/)[0].split("/").filter(Boolean);
  if (segs[0] === "te") segs = segs.slice(1);
  if (segs.length === 0) return null;
  if (segs[0] === "events" && segs[2] === "ghats" && segs[3] && segs.length === 4) return { entityType: "ghat", entityId: segs[3] };
  if (segs[0] === "events" && segs[1] && segs.length === 2) return { entityType: "event", entityId: segs[1] };
  if (segs[0] === "tourism" && segs[1] === "itineraries" && segs[2] && segs.length === 3) return { entityType: "itinerary", entityId: segs[2] };
  if (segs[0] === "boats" && segs.length === 2 && segs[1] !== "operators") return { entityType: "boat_route", entityId: segs[1] };
  const hit = PREFIX_TYPES.find(([p]) => p === segs[0]);
  if (hit && segs.length === 2 && segs[1]) return { entityType: hit[1], entityId: segs[1] };
  return null;
}

const EMAIL = /\S+@\S+\.\S+/;
const LONG_DIGITS = /\d{6,}/;
/** Search terms are kept only if they can't be personal data: no emails, no long digit runs (phones, ids). */
export function sanitizeSearchTerm(raw: string | undefined): string | null {
  const t = (raw ?? "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
  if (t.length < 2) return null;
  if (EMAIL.test(t) || LONG_DIGITS.test(t.replace(/[\s-]/g, ""))) return null;
  return t;
}

const cleanLabel = (s: string | undefined) => (s ?? "").replace(/\s*\|\s*Pushkaralu\s*$/i, "").replace(/\s+/g, " ").trim().slice(0, 100);

/**
 * Turns one client event into the counters to bump. Views are derived from
 * the path (a client can't claim a view of an arbitrary id). A page_view of
 * a detail page also yields an entity_view.
 */
export function resolveEvent(input: AnalyticsEventInput): CountedEvent[] {
  if (input.type !== "search" && input.type !== "app_open" && !input.type.startsWith("ad_") && !isTrackablePath(input.path)) return [];
  const label = cleanLabel(input.label);
  const first = input.first;
  const path = normalizePath(input.path);
  const entity = classifyPath(input.path);
  const out: CountedEvent[] = [];
  switch (input.type) {
    case "page_view":
      out.push({ type: "page_view", entityType: "page", entityId: path, action: "", label: "", first });
      if (entity) out.push({ type: "entity_view", entityType: entity.entityType, entityId: entity.entityId, action: "", label, first });
      break;
    case "entity_view":
      if (entity) out.push({ type: "entity_view", entityType: entity.entityType, entityId: entity.entityId, action: "", label, first });
      break;
    case "search": {
      const term = sanitizeSearchTerm(input.term);
      if (term) out.push({ type: "search", entityType: "search", entityId: term, action: "", label: term, first: true });
      break;
    }
    case "app_open":
      out.push({ type: "app_open", entityType: "app", entityId: "session", action: input.action === "standalone" ? "standalone" : "browser", label: "", first: true });
      break;
    case "click": {
      const action = (CLICK_ACTIONS as readonly string[]).includes(input.action ?? "") ? (input.action as string) : "other";
      if (entity) out.push({ type: "click", entityType: entity.entityType, entityId: entity.entityId, action, label, first: true });
      break;
    }
    case "inquiry_start":
      if (entity) out.push({ type: "inquiry_start", entityType: entity.entityType, entityId: entity.entityId, action: "", label, first });
      break;
    case "share": {
      const channel = (SHARE_CHANNELS as readonly string[]).includes(input.action ?? "") ? (input.action as string) : "other";
      out.push({ type: "share", entityType: entity?.entityType ?? "page", entityId: entity?.entityId ?? path, action: channel, label, first: true });
      break;
    }
    case "ad_impression":
    case "ad_click":
      if (input.campaignId && /^[A-Za-z0-9_-]{4,60}$/.test(input.campaignId)) {
        out.push({ type: input.type, entityType: "campaign", entityId: input.campaignId, action: (input.action ?? "").slice(0, 40), label: "", first: input.type === "ad_click" ? true : first });
      }
      break;
  }
  return out;
}
