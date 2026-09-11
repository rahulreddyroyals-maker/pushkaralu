import { listPurohits } from "@/features/purohits/api";
import { Card, Badge, EmptyState } from "@/components/ui";
import { ApprovalActions } from "@/components/admin/ApprovalActions";

export default async function AdminPurohitsPage() {
  const { items } = await listPurohits({ pageSize: 100, includeUnverified: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Purohits</h1>
        <p className="text-sm text-ink-muted">Review and approve purohit profile applications.</p>
      </div>

      {items.length === 0 && <EmptyState title="No purohit applications yet" description="Submissions will appear here." />}

      <div className="flex flex-col gap-3">
        {items.map((purohit) => (
          <Card key={purohit.id} padding="md" className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ink">{purohit.name.en}</p>
                <Badge tone={purohit.approvalStatus === "VERIFIED" ? "success" : purohit.approvalStatus === "REJECTED" ? "danger" : "neutral"}>
                  {purohit.approvalStatus}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{purohit.languages.join(", ")}</p>
              <p className="font-data text-xs text-ink-muted">{purohit.experienceYears} years · {purohit.ritualIds.length} rituals</p>
            </div>
            <ApprovalActions currentStatus={purohit.approvalStatus} approvalUrl={`/api/admin/purohits/${purohit.id}/approval`} />
          </Card>
        ))}
      </div>
    </div>
  );
}
