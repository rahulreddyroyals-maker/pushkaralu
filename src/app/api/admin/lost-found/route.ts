import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { moderationQueue } from "@/features/lostFound/service";
import { REPORT_STATUSES, type ReportStatus } from "@/features/lostFound/types";

export async function GET(req: NextRequest) {
  return guarded(async () => {
    const status = req.nextUrl.searchParams.get("status") ?? "PENDING";
    const safe = (REPORT_STATUSES as readonly string[]).includes(status) ? (status as ReportStatus) : "PENDING";
    return toHttp(await moderationQueue(lostFoundDeps, await getActor(), safe));
  });
}
