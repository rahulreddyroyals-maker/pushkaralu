import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/ui";
import { InboxClient } from "@/components/notifications/InboxClient";
import { getActor } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { listInbox } from "@/features/notifications/service";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const actor = await getActor();
  if (!actor) redirect("/login?redirect=/notifications");
  const result = await listInbox(notificationDeps, actor);

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Notifications" }]} />
        <div className="mt-3 mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink">Notifications</h1>
          <Link href="/notifications/preferences" className="text-sm font-medium text-river-deep underline">
            Preferences
          </Link>
        </div>
        <InboxClient initial={result.ok ? result.data.items : []} nextCursor={result.ok ? result.data.nextCursor : null} />
      </div>
    </SiteShell>
  );
}
