import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import type { UserProfile } from "@/features/auth/types";

/**
 * Protected page — the actual enforcement is this server-side check, not
 * middleware (see docs/ARCHITECTURE.md §5 and middleware.ts). If there's
 * no valid session, we never render the page at all.
 */
export default async function ProfilePage() {
  const serverUser = await getServerUser();
  if (!serverUser) {
    redirect("/login?redirect=/profile");
  }

  const db = getAdminDb();
  const snapshot = await db.collection("users").doc(serverUser.uid).get();
  const profile = snapshot.data() as UserProfile | undefined;

  return (
    <SiteShell>
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold text-ink">Your profile</h1>
        <ProfileForm
          initialDisplayName={profile?.displayName ?? serverUser.email ?? ""}
          initialLocale={(profile?.locale as "en" | "te") ?? "en"}
          email={serverUser.email}
          role={serverUser.role}
        />
      </div>
    </SiteShell>
  );
}
