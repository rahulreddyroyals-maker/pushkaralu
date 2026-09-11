"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { ApprovalStatus } from "@/types/domain";

interface ApprovalActionsProps {
  currentStatus: ApprovalStatus;
  approvalUrl: string; // PATCH { approvalStatus, reason }
}

/**
 * Shared by hotels/purohits/businesses admin queues. A reason is always
 * required — it's what lands in the audit log (see the approval Route
 * Handlers), and "why was this rejected" is exactly the kind of thing an
 * admin will want to look back on.
 */
export function ApprovalActions({ currentStatus, approvalUrl }: ApprovalActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(approvalStatus: ApprovalStatus) {
    const reason = prompt(`Reason for marking this ${approvalStatus.toLowerCase()} (for the audit log):`);
    if (!reason || reason.trim().length < 3) {
      if (reason !== null) alert("Please provide at least a few words of reason.");
      return;
    }
    setBusy(true);
    try {
      await fetch(approvalUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus, reason: reason.trim() }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus !== "VERIFIED" && (
        <Button size="sm" onClick={() => setStatus("VERIFIED")} disabled={busy}>
          Approve
        </Button>
      )}
      {currentStatus !== "REJECTED" && (
        <Button size="sm" variant="danger" onClick={() => setStatus("REJECTED")} disabled={busy}>
          Reject
        </Button>
      )}
      {currentStatus === "VERIFIED" && (
        <Button size="sm" variant="outline" onClick={() => setStatus("SUSPENDED")} disabled={busy}>
          Suspend
        </Button>
      )}
    </div>
  );
}
