"use client";

import { useState } from "react";
import { LocationCard, Button, EmptyState, ErrorState } from "@/components/ui";
import type { Temple } from "@/features/temples/types";
import type { PageResult } from "@/lib/pagination";

interface TempleListClientProps {
  initial: PageResult<Temple>;
}

export function TempleListClient({ initial }: TempleListClientProps) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchTemples({ reset }: { reset: boolean }) {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (!reset && cursor) params.set("cursor", cursor);

    try {
      const res = await fetch(`/api/temples?${params.toString()}`);
      if (!res.ok) throw new Error("Request failed");
      const data: PageResult<Temple> = await res.json();
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
    } catch {
      setError("Couldn't load temples. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 sm:max-w-md">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchTemples({ reset: true })}
          placeholder="Search temples by name..."
          className="h-11 flex-1 rounded-lg border border-border bg-surface-raised px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20"
        />
        <Button variant="outline" onClick={() => fetchTemples({ reset: true })} disabled={loading}>
          Search
        </Button>
      </div>

      {error && (
        <ErrorState title="Couldn't load temples" description={error} action={{ label: "Retry", onClick: () => fetchTemples({ reset: true }) }} />
      )}

      {!error && items.length === 0 && <EmptyState title="No temples found" description="Try a different search." />}

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((temple) => (
            <LocationCard
              key={temple.id}
              href={`/temples/${temple.id}`}
              image={temple.images[0]}
              title={temple.name.en}
              subtitle={temple.address}
              meta={temple.timings}
            />
          ))}
        </div>
      )}

      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchTemples({ reset: false })} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
