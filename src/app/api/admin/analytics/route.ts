import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { parseRange } from "@/lib/analytics/days";
import { adminReport } from "@/features/analytics/reports";
import { reportDeps } from "@/features/analytics/reportsData";

export const dynamic = "force-dynamic";

/** Platform analytics — admins only (editors/moderators are staff but may not see business or revenue data). */
export async function GET(req: NextRequest) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const report = await adminReport(reportDeps(), parseRange(req.nextUrl.searchParams.get("range")));
  return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
}
