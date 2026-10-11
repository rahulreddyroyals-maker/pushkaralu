import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { parseRange } from "@/lib/analytics/days";
import { providerReport } from "@/features/analytics/reports";
import { reportDeps } from "@/features/analytics/reportsData";

export const dynamic = "force-dynamic";

/** The signed-in owner's own analytics. The owner is the session uid — there is no id parameter to tamper with. */
export async function GET(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const report = await providerReport(reportDeps(), user.uid, parseRange(req.nextUrl.searchParams.get("range")));
  return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
}
