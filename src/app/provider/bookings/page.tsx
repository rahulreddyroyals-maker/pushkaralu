import { redirect, notFound } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { listBookingsForProvider } from "@/features/bookings/api";
import { resolveListingOwnerId } from "@/features/leads/resolveOwner";
import { isAdminRole } from "@/types/roles";
import { SiteShell } from "@/components/layout/SiteShell";
import { BookingList } from "@/features/bookings/components/BookingList";
import { Breadcrumb } from "@/components/ui";
import type { LeadProviderType } from "@/features/leads/types";

export const dynamic = "force-dynamic";

export default async function ProviderBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ providerId?: string; providerType?: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/provider");

  const { providerId, providerType } = await searchParams;
  if (!providerId || !providerType) redirect("/provider");

  // Ownership checked here too, not just in the API — this page reads
  // Firestore directly via the Admin SDK (which bypasses rules), so the
  // page itself has to be the gate for its own server-rendered data.
  if (!user.role || !isAdminRole(user.role)) {
    const ownerId = await resolveListingOwnerId(providerType as LeadProviderType, providerId);
    if (ownerId !== user.uid) notFound();
  }

  const bookings = await listBookingsForProvider(providerId);

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Provider Dashboard", href: "/provider" }, { label: "Bookings" }]} />
        <h1 className="mt-3 mb-6 text-2xl font-semibold text-ink">Bookings</h1>
        <BookingList bookings={bookings} actor="provider" showFinancials />
      </div>
    </SiteShell>
  );
}
