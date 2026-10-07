import { directionsUrl } from "@/lib/catalog/format";
import type { GeoPoint } from "@/types/domain";

/** Plain link (no JS) — opens turn-by-turn navigation in the phone's maps app. */
export function DirectionsButton({ location, label = "Get directions" }: { location: GeoPoint; label?: string }) {
  return (
    <a
      href={directionsUrl(location)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-river-deep px-5 text-sm font-medium text-white hover:bg-[#0b3e4b]"
    >
      <span aria-hidden>🧭</span> {label}
    </a>
  );
}
