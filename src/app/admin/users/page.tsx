import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/guards";
import { ADMIN_ROLES } from "@/types/roles";
import { listUsers } from "@/features/users/list";
import { Card, Badge, EmptyState } from "@/components/ui";
import { RoleSelect } from "@/components/admin/RoleSelect";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getServerUser();
  if (!user || !hasAnyRole(user.role, ADMIN_ROLES)) redirect("/admin");
  const { q = "" } = await searchParams;
  const users = await listUsers(q);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Users &amp; roles</h1>
        <p className="text-sm text-ink-muted">Give staff roles (Editor, Moderator) and approve providers. Only a Super Admin can grant Admin or Super Admin. Every change is audit-logged.</p>
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or email" className="w-full max-w-sm rounded-md border border-border bg-surface-raised px-3 py-2 text-sm" />
        <button className="rounded-md bg-river-deep px-4 py-2 text-sm text-white">Search</button>
      </form>
      {users.length === 0 && <EmptyState title="No users found" description="New sign-ups appear here." />}
      <div className="flex flex-col gap-3">
        {users.map((u) => (
          <Card key={u.uid} padding="md" className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ink">{u.displayName || "—"}</p>
                <Badge tone="info">{u.role}</Badge>
              </div>
              <p className="text-sm text-ink-muted">{u.email ?? "no email"}</p>
            </div>
            <RoleSelect uid={u.uid} current={u.role} />
          </Card>
        ))}
      </div>
    </div>
  );
}
