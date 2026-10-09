import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/ui";
import { PreferencesClient } from "@/components/notifications/PreferencesClient";
import { getActor } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { getPreferences } from "@/features/notifications/service";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notification preferences", robots: { index: false } };

export default async function PreferencesPage() {
  const actor = await getActor();
  if (!actor) redirect("/login?redirect=/notifications/preferences");
  const result = await getPreferences(notificationDeps, actor);
  if (!result.ok) redirect("/notifications");

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Notifications", href: "/notifications" }, { label: "Preferences" }]} />
        <h1 className="mt-3 mb-6 text-2xl font-semibold text-ink">Notification preferences</h1>
        <PreferencesClient initial={result.data} />
      </div>
    </SiteShell>
  );
}
