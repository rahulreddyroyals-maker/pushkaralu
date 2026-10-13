"use client";

import { useState } from "react";
import { ROLES, type Role } from "@/types/roles";
import { Button } from "@/components/ui";

/** Changes one user's role through the audited endpoint. The server decides whether the caller may grant it (only SUPER_ADMIN can grant ADMIN/SUPER_ADMIN). */
export function RoleSelect({ uid, current }: { uid: string; current: string }) {
  const [role, setRole] = useState<Role>((ROLES as readonly string[]).includes(current) ? (current as Role) : "USER");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const reason = window.prompt(`Reason for changing role to ${role} (saved in the audit log):`);
    if (!reason || reason.trim().length < 3) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${uid}/role`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, reason }) });
      const data = await res.json().catch(() => ({}));
      setMsg(res.ok ? "Saved. The user must sign out and in again." : res.status === 403 ? "Not allowed (only a Super Admin can grant Admin roles)." : data.error ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded-md border border-border bg-surface-raised px-2 py-1 text-sm">
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <Button size="sm" onClick={save} disabled={busy || role === current}>Save</Button>
      {msg && <span className="text-xs text-ink-muted">{msg}</span>}
    </div>
  );
}
