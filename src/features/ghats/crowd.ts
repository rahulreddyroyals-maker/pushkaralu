import { MANUAL_STATUS_STALE_HOURS } from "@/config/app";
import type { CrowdStatus } from "@/types/domain";
import type { OperationalStatus } from "./types";

/** Pure crowd-status rules shared by pages, the update service and notifications. */

export const CROWD_LEVELS: readonly CrowdStatus[] = ["LOW", "MODERATE", "HIGH", "CRITICAL"];
export const CROWD_RANK: Record<CrowdStatus, number> = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 };

export const CROWD_LABELS: Record<CrowdStatus, string> = { LOW: "Low", MODERATE: "Moderate", HIGH: "High", CRITICAL: "Critical" };

/** Where the number comes from. There is no automatic source in this platform, so this is always staff. */
export const CROWD_SOURCE_LABEL = "Entered manually by event staff — not an automatic or live sensor reading";

export interface CrowdSnapshot {
  crowdStatus: CrowdStatus;
  crowdStatusUpdatedAt: string;
  crowdStatusUpdatedBy: string | null;
  waitMinutes?: number | null;
  operationalStatus: OperationalStatus;
  alternativeGhatId?: string | null;
  statusNote?: string;
}

/** A ghat nobody has reported on carries a placeholder level — it must not be displayed as a real "Low". */
export const isCrowdReported = (g: Pick<CrowdSnapshot, "crowdStatusUpdatedBy">) => g.crowdStatusUpdatedBy !== null && g.crowdStatusUpdatedBy !== undefined;

export function relativeTime(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Absolute IST timestamp, fixed locale/zone so server and browser render identically. */
export function formatIst(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)) + " IST";
}

export function isStale(iso: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(iso).getTime() > MANUAL_STATUS_STALE_HOURS * 3_600_000;
}

export function formatWait(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined) return null;
  if (minutes === 0) return "No wait reported";
  if (minutes < 60) return `About ${minutes} min wait`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `About ${h} h${m ? ` ${m} min` : ""} wait`;
}

export type CrowdAlert = { kind: "ESCALATED"; level: CrowdStatus; key: string } | { kind: "CLOSED"; key: string };

/**
 * When is a staff update worth pushing to followers? Only on a change that
 * matters: crowd rising INTO high/critical, or a ghat being closed. Falling
 * levels and repeated identical reports never alert.
 */
export function crowdAlertFor(prev: Pick<CrowdSnapshot, "crowdStatus" | "operationalStatus" | "crowdStatusUpdatedBy">, next: Pick<CrowdSnapshot, "crowdStatus" | "operationalStatus">): CrowdAlert | null {
  if (next.operationalStatus === "CLOSED" && prev.operationalStatus !== "CLOSED") return { kind: "CLOSED", key: "closed" };
  const rose = CROWD_RANK[next.crowdStatus] >= CROWD_RANK.HIGH && (!isCrowdReported(prev) || CROWD_RANK[next.crowdStatus] > CROWD_RANK[prev.crowdStatus]);
  if (rose) return { kind: "ESCALATED", level: next.crowdStatus, key: next.crowdStatus.toLowerCase() };
  return null;
}
