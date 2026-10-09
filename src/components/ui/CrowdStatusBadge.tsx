import { Badge } from "@/components/ui";
import type { CrowdStatus } from "@/types/domain";
import { CROWD_LABELS, CROWD_SOURCE_LABEL, formatIst, formatWait, isStale, relativeTime } from "@/features/ghats/crowd";

const TONE: Record<CrowdStatus, "success" | "warning" | "danger"> = {
  LOW: "success",
  MODERATE: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

interface CrowdStatusBadgeProps {
  status: CrowdStatus;
  updatedAt: string;
  /** uid of the staff member who reported; null = nobody has reported yet (the stored level is a placeholder). Omit only for callers that don't know. */
  reportedBy?: string | null;
  waitMinutes?: number | null;
  operationalStatus?: "OPEN" | "CLOSED" | "UNKNOWN";
  note?: string;
  /** Show the full block (wait, open/closed, note, absolute time, how it was obtained). Otherwise a compact badge + relative time. */
  detailed?: boolean;
}

/**
 * Spec Module 3: "Never present manually entered information as
 * automatically live." Every crowd figure on this platform is typed in by
 * staff, so this component (a) never says "live", (b) always shows when it
 * was last updated, (c) flags reports older than MANUAL_STATUS_STALE_HOURS,
 * and (d) refuses to show a level for a ghat nobody has reported on.
 */
export function CrowdStatusBadge({ status, updatedAt, reportedBy, waitMinutes, operationalStatus = "UNKNOWN", note, detailed = false }: CrowdStatusBadgeProps) {
  if (reportedBy === null) {
    return (
      <div className="flex flex-col gap-1">
        <Badge tone="neutral">Crowd not reported</Badge>
        {detailed && <span className="text-xs text-ink-muted">Staff haven&apos;t posted a crowd update for this ghat yet. Please don&apos;t assume it is quiet.</span>}
      </div>
    );
  }

  const stale = isStale(updatedAt);
  const wait = formatWait(waitMinutes);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={TONE[status]} dot>
          {CROWD_LABELS[status]} crowd
        </Badge>
        {operationalStatus === "OPEN" && <Badge tone="success">Open</Badge>}
        {operationalStatus === "CLOSED" && <Badge tone="danger">Closed</Badge>}
      </div>
      <span className="font-data text-xs text-ink-muted">
        Updated {relativeTime(updatedAt)}
        {detailed && ` · ${formatIst(updatedAt)}`}
        {stale && <span className="ml-1 font-medium text-status-warning"> · May be outdated</span>}
      </span>
      {detailed && (
        <>
          {wait && <span className="text-sm text-ink">{wait}</span>}
          {operationalStatus === "UNKNOWN" && <span className="text-xs text-ink-muted">Whether this ghat is open hasn&apos;t been reported.</span>}
          {note && <span className="text-sm text-ink">{note}</span>}
          <span className="text-xs text-ink-muted">{CROWD_SOURCE_LABEL}.</span>
        </>
      )}
    </div>
  );
}
