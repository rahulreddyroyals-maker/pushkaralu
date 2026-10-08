import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { getReport } from "@/features/lostFound/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => toHttp(await getReport(lostFoundDeps, await getActor(), (await params).id)));
}
