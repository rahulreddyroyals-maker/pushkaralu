import { Badge } from "@/components/ui";
import type { CrowdStatus } from "@/types/domain";

const TONE: Record<CrowdStatus, "success" | "warning" | "danger"> = {
  LOW: "success",
  MODERATE: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

/** Coarse, human-readable relative time — no dependency needed for this. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

interface CrowdStatusBadgeProps {
  status: CrowdStatus;
  updatedAt: string;
}

/**
 * Spec Module 3: "Never present manually entered information as
 * automatically live. Clearly show 'Updated X minutes ago'." The relative
 * timestamp is not decorative — it's the thing that keeps this honest.
 */
export function CrowdStatusBadge({ status, updatedAt }: CrowdStatusBadgeProps) {
  return (
    <div className="flex flex-col gap-1">
      <Badge tone={TONE[status]} dot>
        {status}
      </Badge>
      <span className="font-data text-xs text-ink-muted">Updated {relativeTime(updatedAt)}</span>
    </div>
  );
}
