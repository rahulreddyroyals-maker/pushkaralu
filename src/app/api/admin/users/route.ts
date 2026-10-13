import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { listUsers } from "@/features/users/list";

export const dynamic = "force-dynamic";

/** Admin-only user directory: GET /api/admin/users?q=<email or name fragment> */
export async function GET(req: NextRequest) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  return NextResponse.json({ items: await listUsers(req.nextUrl.searchParams.get("q") ?? "") });
}
