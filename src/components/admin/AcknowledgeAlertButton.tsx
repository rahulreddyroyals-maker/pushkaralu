"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { api } from "@/lib/clientApi";

export function AcknowledgeAlertButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    const res = await api(`/api/admin/family-alerts/${id}`, "POST", {});
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }
  return (
    <div>
      <Button size="sm" variant="outline" disabled={busy} onClick={go}>
        Acknowledge
      </Button>
      {error && <p role="alert" className="mt-1 text-xs text-status-critical">{error}</p>}
    </div>
  );
}
