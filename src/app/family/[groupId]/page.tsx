import { notFound, redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/ui";
import { FamilyGroupClient } from "@/components/family/FamilyGroupClient";
import { getActor } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { getGroupView } from "@/features/family/service";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

export const metadata = { title: "Family group", robots: { index: false } };

export default async function FamilyGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const actor = await getActor();
  if (!actor) redirect(`/login?redirect=/family/${groupId}`);
  const result = await getGroupView(familyDeps, actor, groupId);
  if (!result.ok) notFound(); // not a member == no such group

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Family groups", href: "/family" }, { label: result.data.group.name }]} />
        <FamilyGroupClient groupId={groupId} initial={result.data} myUid={actor.uid} />
      </div>
    </SiteShell>
  );
}
