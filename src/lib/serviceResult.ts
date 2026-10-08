/**
 * Framework-free result type for the Sprint 7 services. Services hold ALL
 * authorization and privacy decisions and know nothing about Next.js or
 * Firestore, so they can be exercised against an in-memory store in tests
 * (that is where the privacy/authz test suite lives). Route handlers only
 * translate a ServiceResult into an HTTP response.
 */
export type ServiceResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string; details?: unknown };

export const ok = <T>(data: T, status = 200): ServiceResult<T> => ({ ok: true, status, data });
export const fail = (status: number, error: string, details?: unknown): ServiceResult<never> => ({ ok: false, status, error, details });

export const unauthenticated = () => fail(401, "Not authenticated");
export const forbidden = () => fail(403, "Forbidden");
/** Used where revealing that a record exists would itself be a leak (private reports, other people's groups). */
export const notFound = () => fail(404, "Not found");

export interface Actor {
  uid: string;
  role: import("@/types/roles").Role | null;
  displayName: string;
}

export interface AuditEntry {
  actorUid: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}
export type AuditSink = (entry: AuditEntry) => Promise<void>;
