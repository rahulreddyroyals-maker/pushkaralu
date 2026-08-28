import { SiteShell } from "@/components/layout/SiteShell";
import { listTemples } from "@/features/temples/api";
import { TempleListClient } from "@/features/temples/components/TempleListClient";
import { Breadcrumb } from "@/components/ui";
import { ROUTES } from "@/config/app";

// force-dynamic — see src/app/events/page.tsx for rationale.
export const dynamic = "force-dynamic";

export default async function TemplesPage() {
  const initial = await listTemples({ pageSize: 12 });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Temples" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-ink">Temple Directory</h1>
        <p className="mt-1 text-ink-muted">Timings, history, and nearby attractions for temples along the way.</p>

        <div className="mt-8">
          <TempleListClient initial={initial} />
        </div>
      </div>
    </SiteShell>
  );
}
