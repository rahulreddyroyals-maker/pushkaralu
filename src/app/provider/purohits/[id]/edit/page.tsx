import { redirect, notFound } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { canManageOwnListing } from "@/lib/auth/guards";
import { getPurohit } from "@/features/purohits/api";
import { listRituals } from "@/features/rituals/api";
import { SiteShell } from "@/components/layout/SiteShell";
import { PurohitForm } from "@/features/purohits/components/PurohitForm";

export const dynamic = "force-dynamic";

export default async function EditPurohitPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/provider");
  const { id } = await params;

  const purohit = await getPurohit(id, { includeUnverified: true });
  if (!purohit) notFound();
  if (!canManageOwnListing(user.role, purohit.userId, user.uid)) notFound();

  const { items: rituals } = await listRituals({ pageSize: 50 });

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-semibold text-ink">Manage your Purohit profile</h1>
        <PurohitForm initial={purohit} availableRituals={rituals} />
      </div>
    </SiteShell>
  );
}
