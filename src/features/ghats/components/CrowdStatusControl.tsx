"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Select, Button } from "@/components/ui";
import { CrowdStatusBadge } from "@/components/ui/CrowdStatusBadge";
import type { CrowdStatus } from "@/types/domain";

interface CrowdStatusControlProps {
  eventId: string;
  ghatId: string;
  currentStatus: CrowdStatus;
  updatedAt: string;
}

/** Separate from the main GhatForm submit — crowd status is a MODERATOR-level action (see docs/ROLES_PERMISSIONS.md), distinct from full ghat edits which require ADMIN. Updates immediately rather than waiting for the full form save. */
export function CrowdStatusControl({ eventId, ghatId, currentStatus, updatedAt }: CrowdStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<CrowdStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/ghats/${ghatId}/crowd-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crowdStatus: status }),
      });
      if (!res.ok) throw new Error("Request failed");
      router.refresh();
    } catch {
      setError("Couldn't update crowd status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="md" className="flex max-w-2xl flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-sm font-medium text-ink">Current crowd status</p>
        <CrowdStatusBadge status={currentStatus} updatedAt={updatedAt} />
      </div>
      <div className="flex items-end gap-3">
        <Select
          label="Set status"
          value={status}
          onChange={(e) => setStatus(e.target.value as CrowdStatus)}
          options={[
            { value: "LOW", label: "Low" },
            { value: "MODERATE", label: "Moderate" },
            { value: "HIGH", label: "High" },
            { value: "CRITICAL", label: "Critical" },
          ]}
        />
        <Button size="sm" onClick={handleUpdate} disabled={saving}>
          {saving ? "Updating..." : "Update"}
        </Button>
      </div>
      {error && <p className="w-full text-xs text-status-critical">{error}</p>}
    </Card>
  );
}
