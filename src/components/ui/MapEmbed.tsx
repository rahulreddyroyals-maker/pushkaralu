import type { GeoPoint } from "@/types/domain";

interface MapEmbedProps {
  location: GeoPoint;
  label: string;
  className?: string;
}

/**
 * Uses the Google Maps Embed API (a plain iframe, no JS SDK to load) when
 * NEXT_PUBLIC_MAPS_PROVIDER_API_KEY is configured. Without a key — the
 * default state for this project until a real key is added — this shows
 * coordinates and a link to open the location in Google Maps directly,
 * rather than a broken or fake-looking map. See spec §6 (env-var-driven
 * maps provider) and §32 (never fabricate information).
 */
export function MapEmbed({ location, label, className }: MapEmbedProps) {
  const apiKey = process.env.NEXT_PUBLIC_MAPS_PROVIDER_API_KEY;
  const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

  if (!apiKey) {
    return (
      <div className={className}>
        <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border bg-river-mist/40 text-center">
          <span className="text-2xl" aria-hidden>
            📍
          </span>
          <p className="font-data text-sm text-ink-muted">
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-river-current hover:underline"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <iframe
        title={`Map showing ${label}`}
        className="aspect-video w-full rounded-[var(--radius-card)] border border-border"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${location.latitude},${location.longitude}`}
      />
    </div>
  );
}
