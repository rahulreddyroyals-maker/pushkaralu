import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { assignRoleSchema } from "@/features/auth/schemas";
import { assignRole } from "@/lib/auth/assignRole";

/**
 * The primary path by which a user's role can ever change (the other is
 * provider-approval routes, which call the same shared src/lib/auth/assignRole.ts
 * function — see that file). Enforces, in order: (1) caller is
 * authenticated via a real server-verified session; (2) request body is
 * a known role from a fixed enum, via Zod; (3) caller's role is actually
 * permitted to grant the requested role (canAssignRole — blocks ADMIN
 * from minting more ADMINs); (4) every successful change is audit-logged.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid: targetUid } = await params;

  const caller = await getServerUser();
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = assignRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await assignRole({
    actorUid: caller.uid,
    actorRole: caller.role,
    targetUid,
    newRole: parsed.data.role,
    reason: parsed.data.reason,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, previousRole: result.previousRole, newRole: result.newRole });
}
