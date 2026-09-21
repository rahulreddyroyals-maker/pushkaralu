import { getRevenueAggregate, getProviderRevenueBreakdown } from "@/features/bookings/api";
import { getMonetizationSettings } from "@/features/settings/api";
import { Card, Badge, EmptyState } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Covers three of the four admin deliverables this sprint asked for —
 * revenue dashboard, commission report, and provider report — on one
 * page, since they're three views of the same booking data and
 * splitting them across three routes would mean three near-identical
 * aggregation passes.
 */
export default async function AdminRevenuePage() {
  const [revenue, providerRows, settings] = await Promise.all([
    getRevenueAggregate(),
    getProviderRevenueBreakdown(),
    getMonetizationSettings(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Revenue</h1>
          <p className="text-sm text-ink-muted">
            Realized figures only — counts CONFIRMED and COMPLETED bookings, excludes pending, cancelled, and refunded.
          </p>
        </div>
        <Link href="/admin/settings" className="text-sm text-river-current hover:underline">
          Commission: {settings.bookingCommissionPercent}% — change in Settings
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card padding="md">
          <p className="font-data text-2xl font-semibold text-ink">{revenue.totalBookings}</p>
          <p className="text-sm text-ink-muted">Total bookings</p>
        </Card>
        <Card padding="md">
          <p className="font-data text-2xl font-semibold text-ink">₹{revenue.totalAmount}</p>
          <p className="text-sm text-ink-muted">Gross booking value</p>
        </Card>
        <Card padding="md">
          <p className="font-data text-2xl font-semibold text-saffron">₹{revenue.totalCommission}</p>
          <p className="text-sm text-ink-muted">Platform commission</p>
        </Card>
        <Card padding="md">
          <p className="font-data text-2xl font-semibold text-ink">₹{revenue.totalProviderPayout}</p>
          <p className="text-sm text-ink-muted">Provider payouts</p>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-ink">Bookings by status</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(revenue.byStatus).map(([status, count]) => (
            <Badge key={status} tone="neutral">
              {status}: {count}
            </Badge>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-ink">Commission by provider</h2>
        {providerRows.length === 0 && (
          <EmptyState title="No realized bookings yet" description="Provider revenue appears once bookings are confirmed or completed." />
        )}
        {providerRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="pb-2 pr-4">Provider</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4 text-right">Bookings</th>
                  <th className="pb-2 pr-4 text-right">Gross</th>
                  <th className="pb-2 pr-4 text-right">Commission</th>
                  <th className="pb-2 text-right">Payout</th>
                </tr>
              </thead>
              <tbody className="font-data">
                {providerRows.map((row) => (
                  <tr key={`${row.providerType}:${row.providerId}`} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-xs text-ink-muted">{row.providerId}</td>
                    <td className="py-2 pr-4">{row.providerType}</td>
                    <td className="py-2 pr-4 text-right">{row.bookingCount}</td>
                    <td className="py-2 pr-4 text-right">₹{Math.round(row.totalAmount * 100) / 100}</td>
                    <td className="py-2 pr-4 text-right text-saffron">₹{Math.round(row.totalCommission * 100) / 100}</td>
                    <td className="py-2 text-right">₹{Math.round(row.totalProviderPayout * 100) / 100}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
