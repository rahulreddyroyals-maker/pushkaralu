import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { listBookingsForCustomer } from "@/features/bookings/api";
import { SiteShell } from "@/components/layout/SiteShell";
import { BookingList } from "@/features/bookings/components/BookingList";
import { Breadcrumb } from "@/components/ui";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/bookings");

  const bookings = await listBookingsForCustomer(user.uid);

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "My bookings" }]} />
        <h1 className="mt-3 mb-6 text-2xl font-semibold text-ink">My bookings</h1>
        {/* showFinancials stays false — a customer sees what they pay, not the platform's commission split. */}
        <BookingList bookings={bookings} actor="customer" />
      </div>
    </SiteShell>
  );
}
