import { SiteShell } from "@/components/layout/SiteShell";
import { listPurohits } from "@/features/purohits/api";
import { PurohitListClient } from "@/features/purohits/components/PurohitListClient";
import { Breadcrumb } from "@/components/ui";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

export default async function PurohitsPage() {
  const initial = await listPurohits({ pageSize: 12 });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Purohits" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-ink">Purohit Directory</h1>
        <p className="mt-1 text-ink-muted">Verified purohits for rituals — languages, experience, and pricing.</p>

        <div className="mt-8">
          <PurohitListClient initial={initial} />
        </div>
      </div>
    </SiteShell>
  );
}
