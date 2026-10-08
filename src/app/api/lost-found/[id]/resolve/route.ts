import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { resolveReport } from "@/features/lostFound/service";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => toHttp(await resolveReport(lostFoundDeps, await getActor(), (await params).id)));
}
