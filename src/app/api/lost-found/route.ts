import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { listPublic, submitReport } from "@/features/lostFound/service";
import { LOST_FOUND_CATEGORIES, REPORT_TYPES, type LostFoundCategory, type ReportType } from "@/features/lostFound/types";

/** Public list: only moderator-approved, sanitized records (see service.toPublicView). */
export async function GET(req: NextRequest) {
  return guarded(async () => {
    const p = req.nextUrl.searchParams;
    const category = p.get("category");
    const reportType = p.get("reportType");
    return toHttp(
      await listPublic(lostFoundDeps, {
        category: (LOST_FOUND_CATEGORIES as readonly string[]).includes(category ?? "") ? (category as LostFoundCategory) : undefined,
        reportType: (REPORT_TYPES as readonly string[]).includes(reportType ?? "") ? (reportType as ReportType) : undefined,
        cursor: p.get("cursor"),
        pageSize: Number(p.get("pageSize")) || undefined,
      })
    );
  });
}

export async function POST(req: NextRequest) {
  return guarded(async () => toHttp(await submitReport(lostFoundDeps, await getActor(), await req.json().catch(() => null))));
}
