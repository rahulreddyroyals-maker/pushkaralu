import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { listResponses, respond } from "@/features/lostFound/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  return guarded(async () => toHttp(await listResponses(lostFoundDeps, await getActor(), (await params).id)));
}

export async function POST(req: NextRequest, { params }: Ctx) {
  return guarded(async () => toHttp(await respond(lostFoundDeps, await getActor(), (await params).id, await req.json().catch(() => null))));
}
