import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth/session";
import { parseRange } from "@/lib/analytics/days";
import { providerReport } from "@/features/analytics/reports";
import { reportDeps } from "@/features/analytics/reportsData";
import { SiteShell } from "@/components/layout/SiteShell";
import { Card, EmptyState } from "@/components/ui";
import { BarChart } from "@/components/analytics/BarChart";
import { RangePicker } from "@/components/analytics/RangePicker";
import { CampaignTable } from "@/components/analytics/CampaignTable";

export const dynamic = "force-dynamic";
const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

/** Owner-scoped: the owner is always the signed-in user; there is no way to request another owner's numbers. */
export default async function ProviderAnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/provider/analytics");
  const range = parseRange((await searchParams).range);
  const r = await providerReport(reportDeps(), user.uid, range);
  const t = r.totals;
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-semibold text-ink">Business analytics</h1>
            <p className="mt-1 text-ink-muted">How visitors find and contact your listings. <Link href="/provider" className="text-river-current hover:underline">Back to dashboard</Link></p></div>
          <RangePicker base="/provider/analytics" current={range} />
        </div>
        {r.listings.length === 0 && r.campaigns.length === 0 ? (
          <div className="mt-8"><EmptyState title="Nothing to report yet" description="Analytics appear once you have a listing." /></div>
        ) : (
          <>
            {r.truncated && <p role="status" className="mt-4 text-sm text-ink-muted">Figures for this range may be partial. Try a shorter range.</p>}
            <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {([["Profile views", t.views], ["Clicks (call, directions, website)", t.clicks], ["Inquiries started", t.inquiryStarts], ["Leads received", t.leads], ["Bookings", t.bookings], ["Booking revenue", `₹${t.revenueInr}`]] as const).map(([l, v]) => (
                <Card key={l} padding="md"><p className="font-data text-2xl font-semibold text-ink">{v}</p><p className="text-sm text-ink-muted">{l}</p></Card>))}
            </section>
            {r.listings.map((l) => (
              <Card key={`${l.type}:${l.id}`} padding="md" className="mt-6">
                <h2 className="font-semibold text-ink">{l.name} <span className="text-xs font-normal text-ink-muted">({l.type})</span></h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {l.stats.views} views · {l.stats.totalClicks} clicks · {l.stats.inquiryStarts} inquiries started · {l.leads} leads · {l.bookings} bookings
                </p>
                <p className="text-xs text-ink-muted">Click rate {pct(l.rates.clickRate)} · lead rate {pct(l.rates.leadRate)} · booking rate {pct(l.rates.bookingRate)} (of views)</p>
                {Object.keys(l.stats.clicks).length > 0 && <p className="mt-1 text-xs text-ink-muted">{Object.entries(l.stats.clicks).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>}
                <div className="mt-3"><BarChart series={l.stats.series} label="Profile views" /></div>
              </Card>))}
            {r.campaigns.length > 0 && <Card padding="md" className="mt-6"><h2 className="mb-3 font-semibold text-ink">Your ad campaigns</h2><CampaignTable rows={r.campaigns} /></Card>}
          </>
        )}
      </div>
    </SiteShell>
  );
}
