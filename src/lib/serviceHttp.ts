import "server-only";
import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeAuditLog } from "@/lib/audit/log";
import type { Actor, AuditSink, ServiceResult } from "@/lib/serviceResult";

/** Builds the acting user from the VERIFIED session cookie + custom-claim role. Nothing here comes from the request body. */
export async function getActor(): Promise<Actor | null> {
  const user = await getServerUser();
  if (!user) return null;
  const profile = await getAdminDb().collection("users").doc(user.uid).get();
  const displayName = (profile.data()?.displayName as string | undefined) ?? user.email ?? "A pilgrim";
  return { uid: user.uid, role: user.role, displayName };
}

export const auditSink: AuditSink = (entry) => writeAuditLog(entry);

/** Service result -> HTTP. Error bodies carry only the safe message (+ zod field details for 400s), never internals. */
export function toHttp<T>(result: ServiceResult<T>): NextResponse {
  if (result.ok) return NextResponse.json(result.data, { status: result.status });
  return NextResponse.json({ error: result.error, ...(result.details ? { details: result.details } : {}) }, { status: result.status });
}

/** Wraps a handler so an unexpected throw becomes a generic 500 and is logged server-side only (spec §39). */
export async function guarded(run: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await run();
  } catch (error) {
    console.error("[safety] unexpected error", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
