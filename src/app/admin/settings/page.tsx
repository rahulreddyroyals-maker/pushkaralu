import { getServerUser } from "@/lib/auth/session";
import { getMonetizationSettings } from "@/features/settings/api";
import { MonetizationSettingsForm } from "@/features/settings/components/MonetizationSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  // The /admin layout already gates this to STAFF_ROLES; this page only
  // additionally distinguishes SUPER_ADMIN (who can edit) from other
  // staff (who can view the rates their reports depend on).
  const user = await getServerUser();
  const settings = await getMonetizationSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Monetization settings</h1>
        <p className="text-sm text-ink-muted">
          Commission and fee configuration. These values are never hardcoded in the app — everything reads from here.
        </p>
      </div>
      <MonetizationSettingsForm initial={settings} canEdit={user?.role === "SUPER_ADMIN"} />
    </div>
  );
}
