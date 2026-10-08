import type { GeoPoint } from "@/types/domain";

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres. Used client-side only, for "nearest to me" — the user's position never leaves the device. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Stable sort by distance; items without a location go last (never silently dropped). */
export function sortByDistance<T extends { location?: GeoPoint }>(items: T[], origin: GeoPoint): T[] {
  return items
    .map((item, index) => ({ item, index, d: item.location ? haversineMeters(origin, item.location) : Number.POSITIVE_INFINITY }))
    .sort((x, y) => x.d - y.d || x.index - y.index)
    .map((x) => x.item);
}
