import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/ui";
import { ReportForm } from "@/components/lostFound/ReportForm";
import { getServerUser } from "@/lib/auth/session";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/lost-and-found/report");
  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Lost & Found", href: ROUTES.lostAndFound }, { label: "New report" }]} />
        <h1 className="mt-3 mb-6 text-2xl font-semibold text-ink">Report lost or found</h1>
        <ReportForm />
      </div>
    </SiteShell>
  );
}
