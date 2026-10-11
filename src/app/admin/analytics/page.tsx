import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { isAdminRole } from "@/types/roles";
import { parseRange } from "@/lib/analytics/days";
import { adminReport } from "@/features/analytics/reports";
import { reportDeps } from "@/features/analytics/reportsData";
import { Card } from "@/components/ui";
import { BarChart } from "@/components/analytics/BarChart";
import { RangePicker } from "@/components/analytics/RangePicker";
import { CampaignTable } from "@/components/analytics/CampaignTable";
import type { TopItem } from "@/lib/analytics/summarize";

export const dynamic = "force-dynamic";

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <Card padding="md"><p className="font-data text-2xl font-semibold text-ink">{value}</p><p className="text-sm text-ink-muted">{label}</p></Card>
);
const TopList = ({ title, items }: { title: string; items: TopItem[] }) => (
  <Card padding="md"><h2 className="mb-2 font-semibold text-ink">{title}</h2>
    {items.length === 0 ? <p className="text-sm text-ink-muted">No data yet.</p> : (
      <ol className="flex flex-col gap-1 text-sm">{items.map((i) => (
        <li key={`${i.entityType}:${i.entityId}`} className="flex justify-between gap-3"><span className="truncate">{i.label || i.entityId}</span><span className="font-data text-ink-muted">{i.count}</span></li>))}</ol>)}
  </Card>
);

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  // /admin allows staff roles; business and revenue analytics are admin-only, so check here as well.
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/admin/analytics");
  if (!user.role || !isAdminRole(user.role)) redirect("/admin?error=forbidden");

  const range = parseRange((await searchParams).range);
  const r = await adminReport(reportDeps(), range);
  const m = r.metrics;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold text-ink">Analytics</h1>
          <p className="text-sm text-ink-muted">Anonymous, aggregate counts (India time). Nothing here identifies a visitor.</p></div>
        <RangePicker base="/admin/analytics" current={range} />
      </div>
      {r.truncated && <p role="status" className="rounded-md border border-border p-3 text-sm text-ink-muted">This range has more data than one report reads; figures are partial. Try a shorter range.</p>}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Page views" value={m.pageViews} /><Stat label="Searches" value={m.searches} /><Stat label="App opens" value={m.appOpens} /><Stat label="Shares" value={m.shares} />
        <Stat label="Provider views" value={m.providerViews} /><Stat label="Hotel views" value={m.hotelViews} /><Stat label="Hotel clicks" value={m.hotelClicks} /><Stat label="Purohit views" value={m.purohitViews} />
        <Stat label="Bookings" value={r.bookings.count} /><Stat label="Revenue (confirmed/completed)" value={`₹${r.bookings.revenueInr}`} /><Stat label="Commission" value={`₹${r.bookings.commissionInr}`} /><Stat label="Inquiry starts" value={m.inquiryStarts} />
      </section>
      <Card padding="md"><h2 className="mb-2 font-semibold text-ink">Page views per day</h2><BarChart series={r.pageViewSeries} label="Page views" /></Card>
      <Card padding="md"><h2 className="mb-2 font-semibold text-ink">Bookings per day</h2><BarChart series={r.bookings.series} label="Bookings" /></Card>
      <section className="grid gap-4 md:grid-cols-2">
        <TopList title="Popular locations" items={r.popularLocations} /><TopList title="Popular services" items={r.popularServices} />
        <TopList title="Top searches" items={r.topSearches} /><TopList title="Top pages" items={r.topPages} />
      </section>
      <Card padding="md"><h2 className="mb-2 font-semibold text-ink">Shares by channel</h2>
        {Object.keys(r.shares).length === 0 ? <p className="text-sm text-ink-muted">No shares yet.</p> :
          <ul className="flex flex-wrap gap-4 text-sm">{Object.entries(r.shares).map(([k, v]) => <li key={k}>{k}: <span className="font-data">{v}</span></li>)}</ul>}
      </Card>
      <Card padding="md"><h2 className="mb-1 font-semibold text-ink">Advertising</h2>
        <p className="mb-3 text-xs text-ink-muted">Impressions and clicks are all-time. Spend is an estimate from client-side counts; impressions can be blocked or inflated, so treat CPM figures as indicative.</p>
        <CampaignTable rows={r.campaigns} showAdvertiser /></Card>
    </div>
  );
}
