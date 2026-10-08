import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/ui";
import { FamilyHome } from "@/components/family/FamilyHome";
import { getActor } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { listMyGroups } from "@/features/family/service";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

export const metadata = { title: "Family Groups", robots: { index: false } };

export default async function FamilyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const actor = await getActor();
  if (!actor) redirect(`/login?redirect=${encodeURIComponent(code ? `/family?code=${code}` : "/family")}`);
  const result = await listMyGroups(familyDeps, actor);

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Family groups" }]} />
        <h1 className="mt-3 mb-6 text-2xl font-semibold text-ink">Family groups</h1>
        <FamilyHome groups={result.ok ? result.data.items : []} initialCode={code?.toUpperCase().slice(0, 8) ?? ""} />
      </div>
    </SiteShell>
  );
}
