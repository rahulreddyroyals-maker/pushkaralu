import Link from "next/link";
import { RANGE_OPTIONS } from "@/lib/analytics/days";

export function RangePicker({ base, current }: { base: string; current: number }) {
  return (
    <nav aria-label="Date range" className="flex gap-1">
      {RANGE_OPTIONS.map((d) => (
        <Link key={d} href={`${base}?range=${d}`} aria-current={d === current ? "page" : undefined}
          className={`rounded-md border px-3 py-1 text-sm ${d === current ? "border-river-current bg-river-current/10 text-ink" : "border-border text-ink-muted hover:text-ink"}`}>
          {d} days
        </Link>
      ))}
    </nav>
  );
}
