import { canModerateContent } from "@/lib/auth/guards";
import { fail, forbidden, notFound, ok, unauthenticated, type Actor, type AuditSink, type ServiceResult } from "@/lib/serviceResult";
import { crowdStatusUpdateSchema } from "./schemas";
import { crowdAlertFor, type CrowdAlert, type CrowdSnapshot } from "./crowd";

export interface CrowdGhat extends CrowdSnapshot {
  id: string;
  eventId: string;
  name: { en: string; te?: string };
  published: boolean;
}

export interface CrowdStore {
  getGhat(eventId: string, ghatId: string): Promise<CrowdGhat | null>;
  applyUpdate(eventId: string, ghatId: string, patch: Record<string, unknown>, updatedBy: string): Promise<void>;
}

export interface CrowdChange {
  eventId: string;
  ghat: { id: string; name: string };
  next: CrowdSnapshot;
  alert: CrowdAlert;
  updatedBy: string;
  alternativeName?: string;
}

export interface CrowdDeps {
  store: CrowdStore;
  audit: AuditSink;
  /** Fire-and-forget hook (notifications). Its failure must never fail or roll back the staff update. */
  onAlertWorthyChange?: (change: CrowdChange) => Promise<void>;
  now?: () => Date;
}

/**
 * One manual crowd report by staff. Only MODERATOR+ (`canModerateContent`);
 * the reporter's uid and the timestamp come from the session and the server,
 * never from the body. Omitted optional fields stay as they are; null clears.
 */
export async function updateCrowd(deps: CrowdDeps, actor: Actor | null, eventId: string, ghatId: string, body: unknown): Promise<ServiceResult<{ updated: true }>> {
  if (!actor) return unauthenticated();
  if (!canModerateContent(actor.role)) return forbidden();
  const parsed = crowdStatusUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const input = parsed.data;

  const ghat = await deps.store.getGhat(eventId, ghatId);
  if (!ghat) return notFound();

  if (input.alternativeGhatId) {
    if (input.alternativeGhatId === ghatId) return fail(400, "A ghat can't be its own alternative");
    const alt = await deps.store.getGhat(eventId, input.alternativeGhatId);
    if (!alt || !alt.published) return fail(400, "Choose a published ghat from the same event as the alternative");
  }

  const patch: Record<string, unknown> = { crowdStatus: input.crowdStatus };
  if (input.waitMinutes !== undefined) patch.waitMinutes = input.waitMinutes;
  if (input.operationalStatus !== undefined) patch.operationalStatus = input.operationalStatus;
  if (input.alternativeGhatId !== undefined) patch.alternativeGhatId = input.alternativeGhatId;
  if (input.statusNote !== undefined) patch.statusNote = input.statusNote;

  await deps.store.applyUpdate(eventId, ghatId, patch, actor.uid);
  await deps.audit({
    actorUid: actor.uid,
    action: "GHAT_CROWD_STATUS_UPDATED",
    targetType: "ghat",
    targetId: ghatId,
    metadata: { eventId, from: ghat.crowdStatus, ...patch },
  });

  const next: CrowdSnapshot = {
    crowdStatus: input.crowdStatus,
    crowdStatusUpdatedAt: (deps.now ?? (() => new Date()))().toISOString(),
    crowdStatusUpdatedBy: actor.uid,
    waitMinutes: input.waitMinutes !== undefined ? input.waitMinutes : ghat.waitMinutes,
    operationalStatus: input.operationalStatus ?? ghat.operationalStatus,
    alternativeGhatId: input.alternativeGhatId !== undefined ? input.alternativeGhatId : ghat.alternativeGhatId,
    statusNote: input.statusNote !== undefined ? input.statusNote : ghat.statusNote,
  };
  const alert = crowdAlertFor(ghat, next);
  if (alert && deps.onAlertWorthyChange) {
    try {
      const alternative = next.alternativeGhatId ? await deps.store.getGhat(eventId, next.alternativeGhatId) : null;
      await deps.onAlertWorthyChange({ eventId, ghat: { id: ghat.id, name: ghat.name.en }, next, alert, updatedBy: actor.uid, ...(alternative?.published ? { alternativeName: alternative.name.en } : {}) });
    } catch (error) {
      console.error("[crowd] alert hook failed (update was saved)", error);
    }
  }
  return ok({ updated: true });
}
