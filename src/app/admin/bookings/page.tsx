import { listAllBookings } from "@/features/bookings/api";
import { BookingList } from "@/features/bookings/components/BookingList";
import { Badge } from "@/components/ui";
import { BOOKING_STATUSES, type BookingStatus } from "@/features/bookings/types";
import Link from "next/link";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = (BOOKING_STATUSES as readonly string[]).includes(status ?? "") ? (status as BookingStatus) : undefined;

  const { items } = await listAllBookings({ pageSize: 100, status: activeStatus });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Bookings</h1>
        <p className="text-sm text-ink-muted">Every booking across all providers.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/bookings">
          <Badge tone={!activeStatus ? "info" : "neutral"}>All</Badge>
        </Link>
        {BOOKING_STATUSES.map((s) => (
          <Link key={s} href={`/admin/bookings?status=${s}`}>
            <Badge tone={activeStatus === s ? "info" : "neutral"}>{s}</Badge>
          </Link>
        ))}
      </div>

      <BookingList bookings={items} actor="admin" showFinancials />
    </div>
  );
}
