import type { CatalogRecordBase } from "@/lib/catalog/types";
import { computeOpenState } from "@/lib/catalog/openStatus";
import { formatDuration, formatInr, pick } from "@/lib/catalog/format";
import { TRANSPORT_KIND_LABELS, type TransportService } from "@/features/transport/definition";
import { BOAT_TYPE_LABELS, type Boat, type BoatOperator, type BoatRoute } from "@/features/boats/definition";
import { PARKING_STATUS_LABELS, type ParkingLocation } from "@/features/parking/definition";
import { DIET_TYPE_LABELS, PRICE_CATEGORY_LABELS, type Restaurant } from "@/features/restaurants/definition";
import { PLACE_KIND_LABELS, type Itinerary, type TourismPlace, type TravelPackage } from "@/features/tourism/definition";

export type CatalogItem = CatalogRecordBase & Record<string, unknown>;
type Tone = "neutral" | "saffron" | "success" | "warning" | "danger" | "info";

export interface CardProps {
  href: string;
  image?: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; tone?: Tone };
  meta?: string;
  price?: string;
}

const first = (images: string[] | undefined) => images?.[0];

/** Public-facing price text. A missing amount is shown as "Price on request" — never as 0 or an invented figure. */
export function priceText(amount: number | undefined, suffix = ""): string {
  return amount === undefined ? "Price on request" : `${formatInr(amount)}${suffix}`;
}

export const PARKING_STATUS_TONE: Record<ParkingLocation["status"], Tone> = { OPEN: "success", FILLING: "warning", FULL: "danger", CLOSED: "neutral" };

/**
 * Pure item -> LocationCard props mapping per catalog. Lives in the shared
 * features layer so the public list client, the server pages and (later)
 * the mobile app all render a catalog item identically.
 */
export function cardFor(catalogKey: string, item: CatalogItem, now: Date = new Date()): CardProps {
  switch (catalogKey) {
    case "transport": {
      const t = item as unknown as TransportService;
      const suffix = t.pricingModel === "PER_KM" ? " / km" : t.pricingModel === "PER_PERSON" ? " / person" : "";
      return {
        href: `/travel/${t.id}`,
        image: first(t.images),
        title: pick(t.name),
        subtitle: pick(t.serviceArea) || t.address,
        badge: { label: TRANSPORT_KIND_LABELS[t.kind], tone: "info" },
        meta: t.operatingHours,
        price: t.pricingModel === "ON_REQUEST" ? "Price on request" : priceText(t.amountInr, suffix),
      };
    }
    case "boat-routes": {
      const r = item as unknown as BoatRoute;
      return {
        href: `/boats/${r.id}`,
        image: first(r.images),
        title: pick(r.title),
        subtitle: `From ${r.startPointName}`,
        badge: r.active ? undefined : { label: "Not operating", tone: "neutral" },
        meta: formatDuration(r.durationMinutes),
        price: r.adultPriceInr === undefined ? "Price on request" : `${formatInr(r.adultPriceInr)} / adult`,
      };
    }
    case "boat-operators": {
      const o = item as unknown as BoatOperator;
      return { href: `/boats/operators/${o.id}`, image: first(o.images), title: pick(o.name), subtitle: o.address };
    }
    case "boats": {
      const b = item as unknown as Boat;
      return {
        href: `/boats/operators/${b.operatorId}`,
        image: first(b.images),
        title: pick(b.name),
        subtitle: BOAT_TYPE_LABELS[b.boatType],
        meta: `Up to ${b.capacity} passengers`,
      };
    }
    case "parking": {
      const p = item as unknown as ParkingLocation;
      return {
        href: `/parking/${p.id}`,
        image: first(p.images),
        title: pick(p.name),
        subtitle: p.address,
        badge: { label: PARKING_STATUS_LABELS[p.status], tone: PARKING_STATUS_TONE[p.status] },
        meta: `Capacity ${p.capacity}`,
      };
    }
    case "restaurants": {
      const r = item as unknown as Restaurant;
      const open = computeOpenState(r, now);
      return {
        href: `/restaurants/${r.id}`,
        image: first(r.images),
        title: pick(r.name),
        subtitle: `${DIET_TYPE_LABELS[r.dietType]} · ${PRICE_CATEGORY_LABELS[r.priceCategory]}`,
        badge: open === "UNKNOWN" ? undefined : { label: open === "OPEN" ? "Open now" : "Closed now", tone: open === "OPEN" ? "success" : "neutral" },
        meta: r.address,
      };
    }
    case "tourism": {
      const p = item as unknown as TourismPlace;
      return {
        href: `/tourism/${p.id}`,
        image: first(p.images),
        title: pick(p.name),
        subtitle: pick(p.tagline) || p.address,
        badge: { label: PLACE_KIND_LABELS[p.kind], tone: p.kind === "TEMPLE" ? "saffron" : "info" },
        meta: p.suggestedDurationMinutes ? `~${formatDuration(p.suggestedDurationMinutes)} visit` : undefined,
      };
    }
    case "itineraries": {
      const i = item as unknown as Itinerary;
      return {
        href: `/tourism/itineraries/${i.id}`,
        image: first(i.images),
        title: pick(i.title),
        subtitle: pick(i.summary),
        badge: { label: i.durationDays <= 1 ? "One day" : `${i.durationDays} days`, tone: "info" },
      };
    }
    case "packages": {
      const p = item as unknown as TravelPackage;
      return {
        href: `/packages/${p.id}`,
        image: first(p.images),
        title: pick(p.title),
        subtitle: pick(p.summary),
        meta: `${p.durationDays} days / ${p.nights} nights`,
        price: p.priceFromInr === undefined ? "Price on request" : `From ${formatInr(p.priceFromInr)}`,
      };
    }
    case "emergency-services": {
      // Emergency entries have no detail pages — the dashboard is the surface. Card kept so admin/search can still list them.
      return { href: "/emergency", title: pick((item as unknown as { name: { en: string } }).name) };
    }
    default:
      return { href: "#", title: item.id };
  }
}
