import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { moderate } from "@/features/lostFound/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => toHttp(await moderate(lostFoundDeps, await getActor(), (await params).id, await req.json().catch(() => null))));
}
