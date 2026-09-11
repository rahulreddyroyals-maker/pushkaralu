import { listBusinesses } from "@/features/businesses/api";
import { BUSINESS_CATEGORY_LABELS } from "@/features/businesses/types";
import { Card, Badge, EmptyState } from "@/components/ui";
import { ApprovalActions } from "@/components/admin/ApprovalActions";

export default async function AdminBusinessesPage() {
  const { items } = await listBusinesses({ pageSize: 100, includeUnverified: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Businesses</h1>
        <p className="text-sm text-ink-muted">Taxis, travel operators, boats, restaurants, local businesses, and guides — all categories.</p>
      </div>

      {items.length === 0 && <EmptyState title="No business applications yet" description="Submissions will appear here." />}

      <div className="flex flex-col gap-3">
        {items.map((b) => (
          <Card key={b.id} padding="md" className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ink">{b.name.en}</p>
                <Badge tone="info">{BUSINESS_CATEGORY_LABELS[b.category]}</Badge>
                <Badge tone={b.approvalStatus === "VERIFIED" ? "success" : b.approvalStatus === "REJECTED" ? "danger" : "neutral"}>
                  {b.approvalStatus}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{b.address}</p>
            </div>
            <ApprovalActions currentStatus={b.approvalStatus} approvalUrl={`/api/admin/businesses/${b.id}/approval`} />
          </Card>
        ))}
      </div>
    </div>
  );
}
