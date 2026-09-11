"use client";

import { useState } from "react";
import { LocationCard, Button, EmptyState, ErrorState } from "@/components/ui";
import type { Business, BusinessCategory } from "@/features/businesses/types";
import type { PageResult } from "@/lib/pagination";

interface BusinessListClientProps {
  category: BusinessCategory | BusinessCategory[];
  initial: PageResult<Business>;
}

/**
 * Shared by every category page (/travel, /boats, /restaurants,
 * /businesses, /guides) — all read from the one `businesses` collection
 * (see features/businesses/types.ts for why). Detail links always go to
 * the single canonical /businesses/{id} route regardless of which
 * category page linked to it, rather than duplicating a detail page per
 * category. `category` accepts multiple values (e.g. Travel combines
 * "taxi" + "travel_operator") so search/pagination stays consistent with
 * whatever the initial server-rendered page actually showed — passing
 * only one of several categories here would silently narrow results on
 * the first search or "load more".
 */
export function BusinessListClient({ category, initial }: BusinessListClientProps) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchBusinesses({ reset }: { reset: boolean }) {
    setError(null);
    setLoading(true);
    const categoryParam = Array.isArray(category) ? category.join(",") : category;
    const params = new URLSearchParams({ category: categoryParam });
    if (search.trim()) params.set("search", search.trim());
    if (!reset && cursor) params.set("cursor", cursor);

    try {
      const res = await fetch(`/api/businesses/search?${params.toString()}`);
      if (!res.ok) throw new Error("Request failed");
      const data: PageResult<Business> = await res.json();
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
    } catch {
      setError("Couldn't load listings. Please try again.");
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
          onKeyDown={(e) => e.key === "Enter" && fetchBusinesses({ reset: true })}
          placeholder="Search by name..."
          className="h-11 flex-1 rounded-lg border border-border bg-surface-raised px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20"
        />
        <Button variant="outline" onClick={() => fetchBusinesses({ reset: true })} disabled={loading}>
          Search
        </Button>
      </div>

      {error && <ErrorState title="Couldn't load listings" description={error} action={{ label: "Retry", onClick: () => fetchBusinesses({ reset: true }) }} />}

      {!error && items.length === 0 && <EmptyState title="No listings found" description="Try a different search." />}

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <LocationCard key={b.id} href={`/businesses/${b.id}`} image={b.images[0]} title={b.name.en} subtitle={b.address} meta={b.pricingNote.en} />
          ))}
        </div>
      )}

      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchBusinesses({ reset: false })} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
