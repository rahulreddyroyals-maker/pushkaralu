"use client";

import { useState } from "react";
import { LocationCard, Button, EmptyState, ErrorState, Select } from "@/components/ui";
import { cardFor, type CatalogItem } from "@/features/catalog/cards";
import type { PageResult } from "@/lib/pagination";

export interface ListFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface CatalogListClientProps {
  catalogKey: string;
  initial: PageResult<CatalogItem>;
  filters?: ListFilter[];
  searchLabel?: string;
  /** Applied to every request (e.g. restrict /tourism to temple tourism). */
  fixedFilters?: Record<string, string>;
  noun: string;
}

/**
 * One public list for every catalog: search, whitelisted filters, "Load
 * more" pagination, plus loading / empty / error states. Reads only the
 * published, private-field-stripped API (/api/catalog/{key}).
 */
export function CatalogListClient({ catalogKey, initial, filters = [], searchLabel, fixedFilters = {}, noun }: CatalogListClientProps) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load({ reset, nextSelected = selected }: { reset: boolean; nextSelected?: Record<string, string> }) {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    for (const [k, v] of Object.entries({ ...nextSelected, ...fixedFilters })) if (v) params.set(k, v);
    if (!reset && cursor) params.set("cursor", cursor);
    try {
      const res = await fetch(`/api/catalog/${catalogKey}?${params.toString()}`);
      if (!res.ok) throw new Error("Request failed");
      const data: PageResult<CatalogItem> = await res.json();
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
    } catch {
      setError(`Couldn't load ${noun}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }

  function onFilter(key: string, value: string) {
    const next = { ...selected, [key]: value };
    setSelected(next);
    void load({ reset: true, nextSelected: next });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex gap-2 sm:w-full sm:max-w-md">
          <input
            aria-label={searchLabel ?? `Search ${noun}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load({ reset: true })}
            placeholder={searchLabel ?? `Search ${noun} by name...`}
            className="h-11 flex-1 rounded-lg border border-border bg-surface-raised px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20"
          />
          <Button variant="outline" onClick={() => load({ reset: true })} disabled={loading}>
            Search
          </Button>
        </div>
        {filters.map((f) => (
          <div key={f.key} className="sm:w-48">
            <Select
              aria-label={f.label}
              options={[{ value: "", label: `All — ${f.label}` }, ...f.options]}
              value={selected[f.key] ?? ""}
              onChange={(e) => onFilter(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      {error && <ErrorState title={`Couldn't load ${noun}`} description={error} action={{ label: "Retry", onClick: () => load({ reset: true }) }} />}
      {!error && items.length === 0 && !loading && <EmptyState title={`No ${noun} found`} description="Try a different search or filter." />}
      {loading && items.length === 0 && <p className="text-sm text-ink-muted">Loading…</p>}

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loading}>
          {items.map((item) => (
            <LocationCard key={item.id} {...cardFor(catalogKey, item)} />
          ))}
        </div>
      )}

      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load({ reset: false })} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
