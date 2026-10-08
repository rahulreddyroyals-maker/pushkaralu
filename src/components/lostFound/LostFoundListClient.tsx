"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Select } from "@/components/ui";
import { LOST_FOUND_CATEGORIES, LOST_FOUND_CATEGORY_LABELS, type PublicLostFoundReport } from "@/features/lostFound/types";
import { formatRelativeTime } from "@/lib/catalog/format";

interface Page {
  items: PublicLostFoundReport[];
  nextCursor: string | null;
}

export function LostFoundListClient({ initial }: { initial: Page }) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [category, setCategory] = useState("");
  const [reportType, setReportType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(reset: boolean, next = { category, reportType }) {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams();
    if (next.category) params.set("category", next.category);
    if (next.reportType) params.set("reportType", next.reportType);
    if (!reset && cursor) params.set("cursor", cursor);
    try {
      const res = await fetch(`/api/lost-found?${params.toString()}`);
      if (!res.ok) throw new Error("failed");
      const data: Page = await res.json();
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
    } catch {
      setError("Couldn't load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="sm:w-52">
          <Select
            aria-label="Category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              void load(true, { category: e.target.value, reportType });
            }}
            options={[{ value: "", label: "All categories" }, ...LOST_FOUND_CATEGORIES.map((c) => ({ value: c, label: LOST_FOUND_CATEGORY_LABELS[c] }))]}
          />
        </div>
        <div className="sm:w-44">
          <Select
            aria-label="Lost or found"
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              void load(true, { category, reportType: e.target.value });
            }}
            options={[
              { value: "", label: "Lost & found" },
              { value: "LOST", label: "Lost" },
              { value: "FOUND", label: "Found" },
            ]}
          />
        </div>
      </div>

      {error && <ErrorState title="Couldn't load reports" description={error} action={{ label: "Retry", onClick: () => load(true) }} />}
      {!error && items.length === 0 && !loading && <EmptyState title="No published reports" description="Reports appear here after a moderator has reviewed them." />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy={loading}>
        {items.map((r) => (
          <Link key={r.id} href={`/lost-and-found/${r.id}`}>
            <Card hoverable padding="md" className="flex h-full flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.reportType === "LOST" ? "danger" : "success"}>{r.reportType === "LOST" ? "Lost" : "Found"}</Badge>
                <Badge tone="neutral">{LOST_FOUND_CATEGORY_LABELS[r.category]}</Badge>
              </div>
              <p className="font-semibold text-ink">{r.title}</p>
              <p className="line-clamp-3 text-sm text-ink-muted">{r.summary}</p>
              <p className="mt-auto text-xs text-ink-muted">
                {r.area} · posted {formatRelativeTime(r.postedAt)}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load(false)} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
