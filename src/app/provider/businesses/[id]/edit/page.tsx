import { redirect, notFound } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { canManageOwnListing } from "@/lib/auth/guards";
import { getBusiness } from "@/features/businesses/api";
import { SiteShell } from "@/components/layout/SiteShell";
import { BusinessForm } from "@/features/businesses/components/BusinessForm";

export const dynamic = "force-dynamic";

export default async function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/provider");
  const { id } = await params;

  const business = await getBusiness(id, { includeUnverified: true });
  if (!business) notFound();
  if (!canManageOwnListing(user.role, business.ownerId, user.uid)) notFound();

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-semibold text-ink">Manage your listing</h1>
        <BusinessForm initial={business} />
      </div>
    </SiteShell>
  );
}
