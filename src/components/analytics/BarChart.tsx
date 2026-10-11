import type { Series } from "@/lib/analytics/summarize";

/**
 * Single-series daily bars (one hue, no legend needed — the heading names the series).
 * Server-renderable inline SVG with a title/desc, and a table equivalent in <details>.
 */
export function BarChart({ series, label }: { series: Series[]; label: string }) {
  const max = Math.max(1, ...series.map((s) => s.value));
  const W = 600, H = 120, gap = 2;
  const bw = Math.max(2, (W - gap * (series.length - 1)) / Math.max(1, series.length));
  const total = series.reduce((n, s) => n + s.value, 0);
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${total} total over ${series.length} days`} className="h-32 w-full">
        <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} stroke="currentColor" className="text-border" />
        {series.map((s, i) => {
          const h = s.value === 0 ? 0 : Math.max(2, (s.value / max) * (H - 8));
          return (
            <rect key={s.day} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={Math.min(3, bw / 2)} className="fill-river-current">
              <title>{`${s.day}: ${s.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-ink-muted">
        <span>{series[0]?.day}</span><span>peak {max}</span><span>{series[series.length - 1]?.day}</span>
      </figcaption>
      <details className="mt-2 text-xs text-ink-muted">
        <summary className="cursor-pointer">View as table</summary>
        <table className="mt-2 w-full text-left"><thead><tr><th>Day</th><th>{label}</th></tr></thead>
          <tbody>{series.map((s) => <tr key={s.day}><td>{s.day}</td><td className="font-data">{s.value}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}
