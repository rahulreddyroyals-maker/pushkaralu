import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { listRituals } from "@/features/rituals/api";
import { SiteShell } from "@/components/layout/SiteShell";
import { PurohitForm } from "@/features/purohits/components/PurohitForm";

export const dynamic = "force-dynamic";

export default async function NewPurohitPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/provider/purohits/new");

  const { items: rituals } = await listRituals({ pageSize: 50 });

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-semibold text-ink">Create your Purohit profile</h1>
        <PurohitForm availableRituals={rituals} />
      </div>
    </SiteShell>
  );
}
