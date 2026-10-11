export { haversineMeters } from "@/lib/safety/geo";
import { haversineMeters } from "@/lib/safety/geo";
import type { GeoPoint } from "@/types/domain";

/** Straight-line distance in km, 1 decimal. Never presented as a driving/walking distance or time. */
export function straightLineKm(a: GeoPoint, b: GeoPoint): number {
  return Math.round((haversineMeters(a, b) / 1000) * 10) / 10;
}

/** Greedy nearest-neighbour order starting from `origin` — a deterministic way to group nearby stops. Pure. */
export function nearestNeighbourOrder<T extends { location: GeoPoint }>(items: T[], origin: GeoPoint): T[] {
  const left = [...items];
  const out: T[] = [];
  let here = origin;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (haversineMeters(here, left[i].location) < haversineMeters(here, left[best].location)) best = i;
    const [next] = left.splice(best, 1);
    out.push(next);
    here = next.location;
  }
  return out;
}
