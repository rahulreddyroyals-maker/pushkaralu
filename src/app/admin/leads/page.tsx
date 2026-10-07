import { listCatalogLeads } from "@/features/leads/api";
import { Card, Badge, EmptyState } from "@/components/ui";
import { formatRelativeTime } from "@/lib/catalog/format";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  transport: "Transport",
  boat_route: "Boat route",
  travel_package: "Travel package",
};

/**
 * Inquiries against admin-managed catalog records (transport, boat routes,
 * packages). These have no provider account, so the platform team follows
 * up directly; owner-managed listings keep their per-provider lead views.
 */
export default async function AdminLeadsPage() {
  const leads = await listCatalogLeads();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Inquiries</h1>
        <p className="text-sm text-ink-muted">Visitor inquiries for transport, boat routes and travel packages.</p>
      </div>

      {leads.length === 0 && <EmptyState title="No inquiries yet" description="Inquiries from the public pages will appear here." />}

      <div className="flex flex-col gap-3">
        {leads.map((lead) => (
          <Card key={lead.id} padding="md" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{TYPE_LABELS[lead.providerType] ?? lead.providerType}</Badge>
              <Badge tone={lead.status === "NEW" ? "saffron" : lead.status === "CLOSED" ? "neutral" : "success"}>{lead.status}</Badge>
              <span className="text-xs text-ink-muted">{formatRelativeTime(lead.createdAt)}</span>
            </div>
            <p className="text-sm text-ink">{lead.message}</p>
            <p className="font-data text-xs text-ink-muted">
              {lead.userDisplayName} · {lead.userContactPhone} · target {lead.providerId}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
