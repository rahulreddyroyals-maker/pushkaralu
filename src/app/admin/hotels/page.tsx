import { listHotels } from "@/features/hotels/api";
import { Card, Badge, EmptyState } from "@/components/ui";
import { ApprovalActions } from "@/components/admin/ApprovalActions";

export default async function AdminHotelsPage() {
  const { items } = await listHotels({ pageSize: 100, includeUnverified: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Hotels</h1>
        <p className="text-sm text-ink-muted">Review and approve hotel listings submitted by providers.</p>
      </div>

      {items.length === 0 && <EmptyState title="No hotel applications yet" description="Submissions will appear here." />}

      <div className="flex flex-col gap-3">
        {items.map((hotel) => (
          <Card key={hotel.id} padding="md" className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ink">{hotel.name.en}</p>
                <Badge tone={hotel.approvalStatus === "VERIFIED" ? "success" : hotel.approvalStatus === "REJECTED" ? "danger" : "neutral"}>
                  {hotel.approvalStatus}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{hotel.address}</p>
              <p className="font-data text-xs text-ink-muted">₹{hotel.priceRangeMin}–₹{hotel.priceRangeMax}/night · {hotel.amenities.length} amenities</p>
            </div>
            <ApprovalActions currentStatus={hotel.approvalStatus} approvalUrl={`/api/admin/hotels/${hotel.id}/approval`} />
          </Card>
        ))}
      </div>
    </div>
  );
}
