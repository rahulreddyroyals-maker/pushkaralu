import { Card, Badge } from "@/components/ui";

const STAT_CARDS = [
  { label: "Users", value: "—", icon: "👤" },
  { label: "Providers", value: "—", icon: "🏬" },
  { label: "Bookings", value: "—", icon: "📖" },
  { label: "Revenue", value: "—", icon: "💳" },
  { label: "Pending approvals", value: "—", icon: "⏳" },
  { label: "Active events", value: "—", icon: "🗓️" },
];

/**
 * Dashboard shell — Sprint 1. Cards render with placeholder values
 * ("—") rather than fabricated numbers; real aggregation wires up once
 * Users/Bookings/Events exist (per spec §32 — never fabricate data).
 */
export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-muted">Platform overview</p>
        </div>
        <Badge tone="info">Sprint 1 — shell only</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="flex items-center justify-between">
              <span aria-hidden className="text-xl">
                {stat.icon}
              </span>
            </div>
            <p className="font-data mt-3 text-2xl font-semibold text-ink">{stat.value}</p>
            <p className="text-sm text-ink-muted">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card padding="lg" className="text-center text-sm text-ink-muted">
        Module screens (Events, Ghats, Hotels, Purohits, Bookings, ...) are
        implemented in their respective sprints per docs/SPRINT_DEPENDENCY_MAP.md.
      </Card>
    </div>
  );
}
