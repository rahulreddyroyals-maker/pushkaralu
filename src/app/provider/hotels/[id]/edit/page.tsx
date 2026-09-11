import { redirect, notFound } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { canManageOwnListing } from "@/lib/auth/guards";
import { getHotel } from "@/features/hotels/api";
import { SiteShell } from "@/components/layout/SiteShell";
import { HotelForm } from "@/features/hotels/components/HotelForm";

export const dynamic = "force-dynamic";

export default async function EditHotelPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/provider");
  const { id } = await params;

  const hotel = await getHotel(id, { includeUnverified: true });
  if (!hotel) notFound();
  if (!canManageOwnListing(user.role, hotel.ownerId, user.uid)) notFound();

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-semibold text-ink">Manage your hotel</h1>
        <HotelForm initial={hotel} />
      </div>
    </SiteShell>
  );
}
