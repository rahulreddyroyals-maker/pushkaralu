import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { canAccessAdminDashboard } from "@/lib/auth/guards";
import { AdminShellClient } from "@/components/layout/AdminShellClient";

/**
 * Admin shell — Sprint 2 adds the real guard here, replacing Sprint 1's
 * intentionally-absent placeholder.
 *
 * This server-side check (getServerUser → verifySessionCookie against
 * Firebase, then canAccessAdminDashboard against the CUSTOM CLAIM role —
 * never the client) is the actual security boundary for page access.
 * Firestore Security Rules are the boundary for the underlying data once
 * admin screens start reading/writing it in later sprints — this layout
 * guard alone does not protect Firestore reads made directly from a
 * client component, only server-rendered access to /admin/* pages.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }
  if (!canAccessAdminDashboard(user.role)) {
    redirect("/?error=forbidden");
  }

  return <AdminShellClient>{children}</AdminShellClient>;
}
