"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Button, Badge, EmptyState, ErrorState } from "@/components/ui";
import type { Purohit } from "@/features/purohits/types";
import type { PageResult } from "@/lib/pagination";

interface PurohitListClientProps {
  initial: PageResult<Purohit>;
}

export function PurohitListClient({ initial }: PurohitListClientProps) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchPurohits({ reset }: { reset: boolean }) {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (!reset && cursor) params.set("cursor", cursor);

    try {
      const res = await fetch(`/api/purohits/search?${params.toString()}`);
      if (!res.ok) throw new Error("Request failed");
      const data: PageResult<Purohit> = await res.json();
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
    } catch {
      setError("Couldn't load purohits. Please try again.");
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
          onKeyDown={(e) => e.key === "Enter" && fetchPurohits({ reset: true })}
          placeholder="Search by name..."
          className="h-11 flex-1 rounded-lg border border-border bg-surface-raised px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20"
        />
        <Button variant="outline" onClick={() => fetchPurohits({ reset: true })} disabled={loading}>
          Search
        </Button>
      </div>

      {error && <ErrorState title="Couldn't load purohits" description={error} action={{ label: "Retry", onClick: () => fetchPurohits({ reset: true }) }} />}

      {!error && items.length === 0 && <EmptyState title="No purohits found" description="Try a different search." />}

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((purohit) => (
            <Link key={purohit.id} href={`/purohits/${purohit.id}`}>
              <Card hoverable padding="md" className="flex h-full flex-col gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">{purohit.name.en}</p>
                  <Badge tone="success">Verified</Badge>
                </div>
                <p className="text-sm text-ink-muted">{purohit.languages.join(", ")}</p>
                <p className="font-data text-xs text-ink-muted">{purohit.experienceYears} years experience</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchPurohits({ reset: false })} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
