import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { setSharing } from "@/features/family/service";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  return guarded(async () => toHttp(await setSharing(familyDeps, await getActor(), (await params).groupId, await req.json().catch(() => null))));
}
