"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";
import { api } from "@/lib/clientApi";
import { createGroupSchema, joinSchema } from "@/features/family/schemas";

interface GroupSummary {
  id: string;
  name: string;
  isOwner: boolean;
  memberCount: number;
}

export function FamilyHome({ groups, initialCode = "" }: { groups: GroupSummary[]; initialCode?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [code, setCode] = useState(initialCode);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contact = ecName || ecPhone ? { name: ecName, phone: ecPhone } : undefined;

  async function create() {
    const parsed = createGroupSchema.safeParse({ name, emergencyContact: contact });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const i of parsed.error.issues) map[i.path.join(".")] ??= i.message;
      return setErrors(map);
    }
    setErrors({});
    setBusy(true);
    setError(null);
    const res = await api<{ id: string }>("/api/family/groups", "POST", parsed.data);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/family/${res.data.id}`);
  }

  async function join() {
    const parsed = joinSchema.safeParse({ code, emergencyContact: contact });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const i of parsed.error.issues) map[i.path.join(".")] ??= i.message;
      return setErrors(map);
    }
    setErrors({});
    setBusy(true);
    setError(null);
    const res = await api<{ groupId: string }>("/api/family/join", "POST", parsed.data);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/family/${res.data.groupId}`);
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Your groups</h2>
        {groups.length === 0 ? (
          <EmptyState title="No family groups yet" description="Create a group, or join one with an invite code." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <Link key={g.id} href={`/family/${g.id}`}>
                <Card hoverable padding="md" className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink">{g.name}</p>
                    <p className="text-xs text-ink-muted">{g.memberCount} member{g.memberCount === 1 ? "" : "s"}</p>
                  </div>
                  {g.isOwner && <Badge tone="saffron">Owner</Badge>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Card padding="md" className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Create or join a group</h2>
        <p className="text-xs text-ink-muted">
          Group members can see your name and the emergency contact you add. Your location is <strong>never</strong> shared unless you turn it on inside a group, and it always switches itself off.
        </p>
        {error && <p role="alert" className="text-sm text-status-critical">{error}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Your emergency contact — name (optional)" value={ecName} onChange={(e) => setEcName(e.target.value)} error={errors["emergencyContact.name"]} />
          <Input label="Emergency contact — phone" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} error={errors["emergencyContact.phone"]} />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Input label="New group name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
            <div><Button onClick={create} disabled={busy}>Create group</Button></div>
          </div>
          <div className="flex flex-col gap-3">
            <Input label="Invite code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} error={errors.code} />
            <div><Button variant="outline" onClick={join} disabled={busy}>Join group</Button></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
