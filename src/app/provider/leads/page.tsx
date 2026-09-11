import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/ui";
import { ProviderLeadsClient } from "@/components/marketplace/ProviderLeadsClient";
import type { LeadProviderType } from "@/features/leads/types";

export const dynamic = "force-dynamic";

export default async function ProviderLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ providerId?: string; providerType?: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/provider");

  const { providerId, providerType } = await searchParams;
  if (!providerId || !providerType) redirect("/provider");

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Provider Dashboard", href: "/provider" }, { label: "Inquiries" }]} />
        <h1 className="mt-3 mb-6 text-2xl font-semibold text-ink">Inquiries</h1>
        {/* Ownership is enforced server-side by the /api/leads GET route itself — this page just passes the ids through. */}
        <ProviderLeadsClient providerId={providerId} providerType={providerType as LeadProviderType} />
      </div>
    </SiteShell>
  );
}
