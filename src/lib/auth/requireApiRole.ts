import { NextResponse } from "next/server";
import { getServerUser, type ServerUser } from "./session";
import { hasAnyRole } from "./guards";
import type { Role } from "@/types/roles";

type RequireRoleResult = { user: ServerUser; error?: undefined } | { user?: undefined; error: NextResponse };

/**
 * Common pattern across every admin Route Handler: authenticate via the
 * real server session, then check the role is one of `allowed`. Returns
 * a discriminated result so callers write:
 *
 *   const auth = await requireRole(ADMIN_ROLES);
 *   if (auth.error) return auth.error;
 *   const { user } = auth;
 */
export async function requireRole(allowed: Role[]): Promise<RequireRoleResult> {
  const user = await getServerUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  if (!hasAnyRole(user.role, allowed)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}
