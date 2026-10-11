import type { CampaignPerf } from "@/features/analytics/reports";
import { Badge } from "@/components/ui";

export function CampaignTable({ rows, showAdvertiser }: { rows: CampaignPerf[]; showAdvertiser?: boolean }) {
  if (!rows.length) return <p className="text-sm text-ink-muted">No campaigns yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-ink-muted"><tr>
          <th className="py-2">Campaign</th>{showAdvertiser && <th>Advertiser</th>}<th>Status</th><th>Dates</th><th className="text-right">Impr.</th><th className="text-right">Clicks</th><th className="text-right">CTR</th><th className="text-right">Est. spend</th>
        </tr></thead>
        <tbody>{rows.map((c) => (
          <tr key={c.id} className="border-t border-border">
            <td className="py-2">{c.title || c.id}<div className="text-xs text-ink-muted">{c.placement} · {c.format}</div></td>
            {showAdvertiser && <td>{c.advertiser}</td>}
            <td><Badge tone={c.status === "ACTIVE" ? "success" : c.status === "EXHAUSTED" || c.status === "CANCELLED" ? "danger" : "neutral"}>{c.status.replace(/_/g, " ")}</Badge></td>
            <td className="text-xs">{c.startDate} → {c.endDate}</td>
            <td className="text-right font-data">{c.impressions}</td><td className="text-right font-data">{c.clicks}</td>
            <td className="text-right font-data">{c.ctrPercent === null ? "—" : `${c.ctrPercent}%`}</td>
            <td className="text-right font-data">{c.estimatedSpendInr === null ? `Flat ₹${c.budgetInr}` : `₹${c.estimatedSpendInr} / ₹${c.budgetInr}`}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}
