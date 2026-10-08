import { canModerateContent } from "@/lib/auth/guards";
import { SAFETY_LIMITS } from "@/config/app";
import { fail, forbidden, notFound, ok, unauthenticated, type Actor, type AuditSink, type ServiceResult } from "@/lib/serviceResult";
import { createReportSchema, moderateSchema, respondSchema } from "./schemas";
import {
  URGENT_CATEGORIES,
  type LostFoundCategory,
  type LostFoundReport,
  type LostFoundResponse,
  type PublicLostFoundReport,
  type ReportStatus,
  type ReportType,
} from "./types";

/** Persistence port. The Firestore adapter lives in ./store.ts; tests use an in-memory one. */
export interface LostFoundStore {
  createReport(report: Omit<LostFoundReport, "id">): Promise<string>;
  getReport(id: string): Promise<LostFoundReport | null>;
  updateReport(id: string, patch: Partial<LostFoundReport>): Promise<void>;
  countReportsSince(reporterId: string, sinceIso: string): Promise<number>;
  listApproved(opts: { category?: LostFoundCategory; reportType?: ReportType; cursor?: string | null; pageSize: number }): Promise<{ items: LostFoundReport[]; nextCursor: string | null }>;
  listByReporter(reporterId: string, limit: number): Promise<LostFoundReport[]>;
  listByStatus(status: ReportStatus, limit: number): Promise<LostFoundReport[]>;
  createResponse(response: Omit<LostFoundResponse, "id">): Promise<string>;
  countResponsesBy(reportId: string, responderId: string): Promise<number>;
  listResponses(reportId: string, limit: number): Promise<LostFoundResponse[]>;
}

export interface Deps {
  store: LostFoundStore;
  audit: AuditSink;
  now?: () => Date;
}

const isModerator = (actor: Actor) => canModerateContent(actor.role);
const isOwner = (actor: Actor, report: LostFoundReport) => report.reporterId === actor.uid;

/**
 * THE privacy boundary: an explicit whitelist. Nothing is spread from the
 * stored report, so a field added to LostFoundReport later is private by
 * default instead of leaking by accident.
 */
export function toPublicView(report: LostFoundReport): PublicLostFoundReport | null {
  if ((report.status !== "APPROVED" && report.status !== "RESOLVED") || !report.publicTitle || !report.publicSummary || !report.publicArea) return null;
  return {
    id: report.id,
    category: report.category,
    reportType: report.reportType,
    title: report.publicTitle,
    summary: report.publicSummary,
    area: report.publicArea,
    status: report.status,
    priority: report.priority,
    postedAt: report.createdAt,
  };
}

export type ReportView = { view: "full"; report: LostFoundReport } | { view: "public"; report: PublicLostFoundReport };

export async function submitReport(deps: Deps, actor: Actor | null, body: unknown): Promise<ServiceResult<{ id: string }>> {
  if (!actor) return unauthenticated();
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const input = parsed.data;
  const now = (deps.now ?? (() => new Date()))();

  // A "last seen" time in the future is a typo or a probe — reject (small clock-skew allowance).
  if (Date.parse(input.lastSeenAt) > now.getTime() + 5 * 60_000) return fail(400, "Last-seen time can't be in the future");

  const since = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  if ((await deps.store.countReportsSince(actor.uid, since)) >= SAFETY_LIMITS.lostFoundReportsPerDay) {
    return fail(429, "You've reached today's report limit. Please contact support if this is urgent.");
  }

  const iso = now.toISOString();
  const id = await deps.store.createReport({
    reporterId: actor.uid, // from the verified session, never from the body
    reporterName: actor.displayName,
    category: input.category,
    reportType: input.reportType,
    title: input.title,
    description: input.description,
    lastSeenPlace: input.lastSeenPlace,
    lastSeenAt: new Date(input.lastSeenAt).toISOString(),
    contactPhone: input.contactPhone,
    ...(input.subjectName ? { subjectName: input.subjectName } : {}),
    ...(input.subjectAge !== undefined ? { subjectAge: input.subjectAge } : {}),
    status: "PENDING", // always — nothing is public before a moderator approves it
    priority: URGENT_CATEGORIES.includes(input.category),
    createdAt: iso,
    updatedAt: iso,
  });
  return ok({ id }, 201);
}

/** Owner and moderators get the full record; everyone else gets only the moderator-approved public view, and a 404 for anything else. */
export async function getReport(deps: Deps, actor: Actor | null, id: string): Promise<ServiceResult<ReportView>> {
  const report = await deps.store.getReport(id);
  if (!report) return notFound();
  if (actor && (isOwner(actor, report) || isModerator(actor))) return ok({ view: "full", report });
  const pub = toPublicView(report);
  return pub ? ok({ view: "public", report: pub }) : notFound();
}

export async function listPublic(
  deps: Deps,
  opts: { category?: LostFoundCategory; reportType?: ReportType; cursor?: string | null; pageSize?: number }
): Promise<ServiceResult<{ items: PublicLostFoundReport[]; nextCursor: string | null }>> {
  const page = await deps.store.listApproved({ ...opts, pageSize: Math.min(Math.max(opts.pageSize ?? 12, 1), 24) });
  const items = page.items.map(toPublicView).filter((v): v is PublicLostFoundReport => v !== null);
  return ok({ items, nextCursor: page.nextCursor });
}

export async function listMine(deps: Deps, actor: Actor | null): Promise<ServiceResult<{ items: LostFoundReport[] }>> {
  if (!actor) return unauthenticated();
  return ok({ items: await deps.store.listByReporter(actor.uid, 50) });
}

/** Moderation queue: moderators only. Urgent (people) first, then oldest first so nothing waits behind newer items. */
export async function moderationQueue(deps: Deps, actor: Actor | null, status: ReportStatus = "PENDING"): Promise<ServiceResult<{ items: LostFoundReport[] }>> {
  if (!actor) return unauthenticated();
  if (!isModerator(actor)) return forbidden();
  const items = await deps.store.listByStatus(status, 100);
  items.sort((a, b) => Number(b.priority) - Number(a.priority) || a.createdAt.localeCompare(b.createdAt));
  return ok({ items });
}

export async function moderate(deps: Deps, actor: Actor | null, id: string, body: unknown): Promise<ServiceResult<{ status: ReportStatus }>> {
  if (!actor) return unauthenticated();
  if (!isModerator(actor)) return forbidden();
  const parsed = moderateSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const report = await deps.store.getReport(id);
  if (!report) return notFound();
  const nowIso = (deps.now ?? (() => new Date()))().toISOString();
  const input = parsed.data;

  if (input.decision === "APPROVE") {
    if (report.status !== "PENDING") return fail(409, `Only pending reports can be approved (this one is ${report.status})`);
    await deps.store.updateReport(id, {
      status: "APPROVED",
      publicTitle: input.publicTitle,
      publicSummary: input.publicSummary,
      publicArea: input.publicArea,
      moderatedBy: actor.uid,
      moderatedAt: nowIso,
      updatedAt: nowIso,
    });
    await deps.audit({ actorUid: actor.uid, action: "LOST_FOUND_APPROVED", targetType: "lostFoundReport", targetId: id, metadata: { category: report.category } });
    return ok({ status: "APPROVED" });
  }

  if (input.decision === "REJECT" && report.status !== "PENDING") return fail(409, `Only pending reports can be rejected (this one is ${report.status})`);
  if (input.decision === "TAKEDOWN" && report.status !== "APPROVED") return fail(409, "Only a published report can be taken down");

  await deps.store.updateReport(id, { status: "REJECTED", rejectionReason: input.reason, moderatedBy: actor.uid, moderatedAt: nowIso, updatedAt: nowIso });
  await deps.audit({
    actorUid: actor.uid,
    action: input.decision === "REJECT" ? "LOST_FOUND_REJECTED" : "LOST_FOUND_TAKEN_DOWN",
    targetType: "lostFoundReport",
    targetId: id,
    metadata: { category: report.category },
  });
  return ok({ status: "REJECTED" });
}

/** Reporter (or a moderator) closes a case — e.g. the person was found, or the report is withdrawn. */
export async function resolveReport(deps: Deps, actor: Actor | null, id: string): Promise<ServiceResult<{ status: ReportStatus }>> {
  if (!actor) return unauthenticated();
  const report = await deps.store.getReport(id);
  // Not the owner and not a moderator: indistinguishable from "doesn't exist".
  if (!report || !(isOwner(actor, report) || isModerator(actor))) return notFound();
  if (report.status !== "PENDING" && report.status !== "APPROVED") return fail(409, `A ${report.status.toLowerCase()} report can't be resolved`);
  const nowIso = (deps.now ?? (() => new Date()))().toISOString();
  await deps.store.updateReport(id, { status: "RESOLVED", resolvedAt: nowIso, updatedAt: nowIso });
  if (!isOwner(actor, report)) {
    await deps.audit({ actorUid: actor.uid, action: "LOST_FOUND_RESOLVED_BY_MODERATOR", targetType: "lostFoundReport", targetId: id });
  }
  return ok({ status: "RESOLVED" });
}

/** "I may have found this" — only on published reports, never on your own, capped per responder. The reporter (not the public) receives the contact. */
export async function respond(deps: Deps, actor: Actor | null, id: string, body: unknown): Promise<ServiceResult<{ id: string }>> {
  if (!actor) return unauthenticated();
  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const report = await deps.store.getReport(id);
  if (!report || report.status !== "APPROVED") return notFound();
  if (isOwner(actor, report)) return fail(400, "You can't respond to your own report");
  if ((await deps.store.countResponsesBy(id, actor.uid)) >= SAFETY_LIMITS.lostFoundResponsesPerReport) {
    return fail(429, "You've already sent several messages about this report");
  }
  const responseId = await deps.store.createResponse({
    reportId: id,
    responderId: actor.uid,
    responderName: actor.displayName,
    message: parsed.data.message,
    contactPhone: parsed.data.contactPhone,
    createdAt: (deps.now ?? (() => new Date()))().toISOString(),
  });
  return ok({ id: responseId }, 201);
}

export async function listResponses(deps: Deps, actor: Actor | null, id: string): Promise<ServiceResult<{ items: LostFoundResponse[] }>> {
  if (!actor) return unauthenticated();
  const report = await deps.store.getReport(id);
  if (!report || !(isOwner(actor, report) || isModerator(actor))) return notFound();
  return ok({ items: await deps.store.listResponses(id, 50) });
}
