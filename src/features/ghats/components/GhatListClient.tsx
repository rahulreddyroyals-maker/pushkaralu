"use client";

import { CROWD_LABELS, relativeTime } from "@/features/ghats/crowd";
import { useState, useTransition } from "react";
import { LocationCard, Button, Select, EmptyState, ErrorState } from "@/components/ui";
import { GHAT_FACILITIES, GHAT_FACILITY_LABELS, type Ghat } from "@/features/ghats/types";
import type { PageResult } from "@/lib/pagination";

interface GhatListClientProps {
  eventId: string;
  initial: PageResult<Ghat>;
}

export function GhatListClient({ eventId, initial }: GhatListClientProps) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [facility, setFacility] = useState<string>("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function fetchGhats({ reset }: { reset: boolean }) {
    setError(null);
    const params = new URLSearchParams();
    if (facility) params.set("facility", facility);
    if (search.trim()) params.set("search", search.trim());
    if (!reset && cursor) params.set("cursor", cursor);

    try {
      const res = await fetch(`/api/events/${eventId}/ghats?${params.toString()}`);
      if (!res.ok) throw new Error("Request failed");
      const data: PageResult<Ghat> = await res.json();
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
    } catch {
      setError("Couldn't load ghats. Please try again.");
    }
  }

  function handleFilterChange() {
    startTransition(() => fetchGhats({ reset: true }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-ink">Search ghats</label>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFilterChange()}
              placeholder="Search by name..."
              className="h-11 flex-1 rounded-lg border border-border bg-surface-raised px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20"
            />
            <Button variant="outline" onClick={handleFilterChange} disabled={isPending}>
              Search
            </Button>
          </div>
        </div>
        <div className="sm:w-56">
          <Select
            label="Facility"
            placeholder="Any facility"
            value={facility}
            onChange={(e) => {
              setFacility(e.target.value);
              startTransition(() => fetchGhats({ reset: true }));
            }}
            options={GHAT_FACILITIES.map((f) => ({ value: f, label: GHAT_FACILITY_LABELS[f] }))}
          />
        </div>
      </div>

      {error && <ErrorState title="Couldn't load ghats" description={error} action={{ label: "Retry", onClick: handleFilterChange }} />}

      {!error && items.length === 0 && (
        <EmptyState title="No ghats found" description="Try a different search or facility filter." />
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((ghat) => (
            <LocationCard
              key={ghat.id}
              href={`/events/${eventId}/ghats/${ghat.id}`}
              image={ghat.images[0]}
              title={ghat.name.en}
              subtitle={ghat.description.en}
              badge={
                ghat.crowdStatusUpdatedBy === null
                  ? { label: "Crowd not reported", tone: "neutral" }
                  : ghat.operationalStatus === "CLOSED"
                    ? { label: "Closed", tone: "danger" }
                    : { label: `${CROWD_LABELS[ghat.crowdStatus]} crowd`, tone: ghat.crowdStatus === "LOW" ? "success" : ghat.crowdStatus === "MODERATE" ? "warning" : "danger" }
              }
              meta={`${ghat.facilities.length} facilities${ghat.crowdStatusUpdatedBy === null ? "" : ` · updated ${relativeTime(ghat.crowdStatusUpdatedAt)}`}`}
            />
          ))}
        </div>
      )}

      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchGhats({ reset: false })} disabled={isPending}>
            {isPending ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
