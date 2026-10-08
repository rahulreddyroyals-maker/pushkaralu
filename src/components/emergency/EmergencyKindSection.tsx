"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { directionsUrl, formatDistance } from "@/lib/catalog/format";
import { haversineMeters, sortByDistance } from "@/lib/safety/geo";
import { telHref } from "@/lib/safety/phone";
import { SAFETY_LIMITS } from "@/config/app";
import type { EmergencyKind, EmergencyService } from "@/features/emergency/definition";
import { EMERGENCY_KIND_ICONS, EMERGENCY_KIND_LABELS } from "@/features/emergency/definition";
import type { GeoPoint } from "@/types/domain";

interface Props {
  kind: EmergencyKind;
  items: EmergencyService[];
  /** Server-rendered "now" in ms so stale-verification is computed identically on server and client (no hydration drift). */
  nowMs: number;
}

function verificationAgeDays(verifiedOn: string, nowMs: number): number {
  return Math.floor((nowMs - Date.parse(verifiedOn)) / 86_400_000);
}

/**
 * One section of the emergency dashboard. Calling and navigation are plain
 * links (tel: / maps URL) so they work with no JavaScript and no account.
 * "Nearest to me" is the only client-side behaviour: it asks the browser for
 * the position ONLY when tapped, uses it on-device to re-sort, and never
 * sends it anywhere.
 */
export function EmergencyKindSection({ kind, items, nowMs }: Props) {
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const hasLocations = items.some((i) => i.location);
  const shown = origin ? sortByDistance(items, origin) : items;

  function locate() {
    setLocError(null);
    if (!("geolocation" in navigator)) {
      setLocError("Your browser can't share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError("Couldn't get your location. You can still call or search the list.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    );
  }

  return (
    <section aria-labelledby={`emergency-${kind}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={`emergency-${kind}`} className="text-lg font-semibold text-ink">
          <span aria-hidden>{EMERGENCY_KIND_ICONS[kind]}</span> {EMERGENCY_KIND_LABELS[kind]}
        </h2>
        {hasLocations && items.length > 1 && (
          <Button variant="outline" size="sm" onClick={locate} disabled={locating}>
            {locating ? "Locating…" : origin ? "Re-sort by distance" : "Nearest to me"}
          </Button>
        )}
      </div>
      {locError && <p className="mb-2 text-xs text-status-critical">{locError}</p>}
      {origin && <p className="mb-2 text-xs text-ink-muted">Sorted by straight-line distance from your device. Your location is not sent anywhere.</p>}

      {shown.length === 0 ? (
        <Card padding="md">
          <p className="text-sm text-ink-muted">
            No verified {EMERGENCY_KIND_LABELS[kind].toLowerCase()} information has been published yet. We don&apos;t show unverified numbers.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shown.map((item) => {
            const age = verificationAgeDays(item.verifiedOn, nowMs);
            const stale = age > SAFETY_LIMITS.emergencyReverifyDays;
            const call = telHref(item.phone);
            const alt = item.alternatePhone ? telHref(item.alternatePhone) : null;
            return (
              <Card key={item.id} padding="md" className="flex flex-col gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{item.name.en}</p>
                    {item.open24x7 && <Badge tone="success">Open 24 hours</Badge>}
                    {origin && item.location && <Badge tone="info">~{formatDistance(haversineMeters(origin, item.location))}</Badge>}
                  </div>
                  {item.address && <p className="mt-1 text-sm text-ink-muted">{item.address}</p>}
                  {!item.open24x7 && item.openingHours && <p className="text-sm text-ink-muted">Hours: {item.openingHours}</p>}
                  {item.services.length > 0 && <p className="mt-1 text-xs text-ink-muted">{item.services.join(" · ")}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {call && (
                    <a
                      href={call}
                      className="inline-flex h-12 min-w-[9rem] items-center justify-center gap-2 rounded-lg bg-status-critical px-5 text-base font-semibold text-white hover:brightness-95"
                      aria-label={`Call ${item.name.en} on ${item.phone}`}
                    >
                      <span aria-hidden>📞</span> Call {item.phone}
                    </a>
                  )}
                  {alt && (
                    <a href={alt} className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-river-deep hover:bg-river-mist">
                      Alt: {item.alternatePhone}
                    </a>
                  )}
                  {item.location && (
                    <a
                      href={directionsUrl(item.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-river-deep px-4 text-sm font-medium text-white hover:bg-[#0b3e4b]"
                    >
                      <span aria-hidden>🧭</span> Navigate
                    </a>
                  )}
                </div>
                <p className={`text-xs ${stale ? "text-status-critical" : "text-ink-muted"}`}>
                  Verified {item.verifiedOn} · {item.verificationSource}
                  {stale ? " — verification is over " + SAFETY_LIMITS.emergencyReverifyDays + " days old; confirm before relying on it." : ""}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
